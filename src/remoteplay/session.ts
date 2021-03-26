import _debug from "debug";
import http from "http";

import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { IDiscoveredDevice } from "../discovery/model";
import { CRYPTO_NONCE_LENGTH, pickCryptoStrategyForDevice } from "./crypto";
import { ICryptoStrategy } from "./crypto/model";
import { RemotePlayVersion, remotePlayVersionFor, remotePlayVersionToString } from "./model";
import { request, typedPath, urlWith } from "./protocol";

const debug = _debug("playactor:remoteplay:session");

const DID_PREFIX = Buffer.from([
    0x00, 0x18, 0x00, 0x00, 0x00, 0x07, 0x00, 0x40, 0x00, 0x80,
]);
const DID_SUFFIX = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const OS_TYPE = "Win10.0.0";

export enum RemotePlayCommand {
    STANDBY = 0x50,
}

export class RemotePlaySession {
    private readonly did: Buffer;

    constructor(
        private readonly device: IDiscoveredDevice,
        public readonly config: IConnectionConfig,
        private readonly crypto: ICryptoStrategy,
        private readonly creds: IRemotePlayCredentials,
        private readonly serverNonce: Buffer,
    ) {
        this.did = Buffer.concat([
            DID_PREFIX,
            Buffer.alloc(16),
            DID_SUFFIX,
        ]);
    }

    public async sendCommand(command: RemotePlayCommand, payload?: Buffer) {
        debug("TODO: send", command);

        const registKey = this.creds.registration["PS5-RegistKey"]
            ?? this.creds.registration["PS4-RegistKey"];
        if (!registKey) {
            throw new Error("Missing RegistKey?");
        }

        // TODO: I *think* we actually only send headers *once*, and
        // then send bodys and read frames like a normal TCP stream
        const headers = {
            "RP-Auth": this.encrypt(Buffer.from(registKey)),
            "RP-Version": this.versionFor(this.device),
            "RP-Did": this.encrypt(this.did),
            "RP-ControllerType": "3",
            "RP-ClientType": "11",
            "RP-OSType": this.encrypt(Buffer.from(OS_TYPE)),
            "RP-ConPath": "1",
        };

        const prelude = Buffer.alloc(8 + (payload?.length ?? 0));
        prelude.writeInt32LE(payload?.length ?? 0);
        prelude.writeInt16LE(command, 4);
        prelude.writeInt16LE(0, 6);

        const body = payload
            ? Buffer.concat([prelude, this.encryptAsBuffer(payload)])
            : prelude;

        const agent = new http.Agent({
            keepAlive: true,
            timeout: 30_000,
        });

        const response = await request(this.urlFor(this.device), {
            agent: {
                http: agent,
            },
            headers,
        });

        const { socket } = response;

        socket.write(body);
        socket.on("data", data => {
            // TODO etc
            debug("received", data);
        });
    }

    private encryptAsBuffer(data: Buffer): Buffer {
        const codec = this.crypto.createCodecForAuth(this.creds, this.serverNonce);
        return codec.encode(data);
    }

    private encrypt(data: Buffer) {
        return this.encryptAsBuffer(data).toString("base64");
    }

    private urlFor(device: IDiscoveredDevice) {
        const version = remotePlayVersionFor(device);
        const path = version < RemotePlayVersion.PS4_10
            ? "/sce/rp/session/ctrl" // PS4 with system version < 8.0
            : typedPath(device, "/sie/:type/rp/sess/ctrl");

        return urlWith(device, path);
    }

    private versionFor(device: IDiscoveredDevice) {
        return remotePlayVersionToString(remotePlayVersionFor(device));
    }
}

export async function openSession(
    device: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: IRemotePlayCredentials,
) {
    const version = remotePlayVersionFor(device);
    const path = version < RemotePlayVersion.PS4_10
        ? "/sce/rp/session" // PS4 with system version < 8.0
        : typedPath(device, "/sie/:type/rp/sess/init");

    const registKey = creds.registration["PS5-RegistKey"]
        ?? creds.registration["PS4-RegistKey"];
    if (!registKey) {
        throw new Error("Invalid credentials: missing RegistKey");
    }

    const response = await request(urlWith(device, path), {
        headers: {
            "RP-RegistKey": registKey,
            "RP-Version": remotePlayVersionToString(version),
        },
    });

    const nonceBase64 = response.headers["rp-nonce"];
    debug("session init nonce=", nonceBase64);
    if (typeof nonceBase64 !== "string") {
        throw new Error(`Unexpected nonce format: "${nonceBase64}"`);
    }

    const nonce = Buffer.from(nonceBase64, "base64");
    if (nonce.length !== CRYPTO_NONCE_LENGTH) {
        throw new Error(`Unexpected nonce length: ${nonce.length}`);
    }

    return new RemotePlaySession(
        device,
        config,
        pickCryptoStrategyForDevice(device),
        creds,
        nonce,
    );
}
