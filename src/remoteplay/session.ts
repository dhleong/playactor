import _debug from "debug";
import http from "http";

import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { IDiscoveredDevice } from "../discovery/model";
import { IDeviceSocket } from "../socket/model";
import { TcpDeviceSocket } from "../socket/tcp";
import { RemotePlayPacketCodec } from "./codec";
import { CRYPTO_NONCE_LENGTH, pickCryptoStrategyForDevice } from "./crypto";
import { RemotePlayVersion, remotePlayVersionFor, remotePlayVersionToString } from "./model";
import { RemotePlayCommand, RemotePlayOutgoingPacket } from "./packets";
import {
    parseHexBytes,
    RemotePlayDeviceProtocol, request, typedPath, urlWith,
} from "./protocol";

const debug = _debug("playactor:remoteplay:session");

const DID_PREFIX = Buffer.from([
    0x00, 0x18, 0x00, 0x00, 0x00, 0x07, 0x00, 0x40, 0x00, 0x80,
]);
const DID_SUFFIX = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const OS_TYPE = "Win10.0.0";

export class RemotePlaySession {
    constructor(
        public readonly config: IConnectionConfig,
        private readonly socket: IDeviceSocket,
    ) {}

    public async sendCommand(command: RemotePlayCommand, payload?: Buffer) {
        debug("TODO: send", command);

        const packet = new RemotePlayOutgoingPacket(command, payload);
        await this.socket.send(packet);
    }
}

/**
 * Step 1: initialize the session and fetch the "server nonce" value
 */
async function initializeSession(
    device: IDiscoveredDevice,
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

    return nonce;
}

function urlFor(device: IDiscoveredDevice) {
    const version = remotePlayVersionFor(device);
    const path = version < RemotePlayVersion.PS4_10
        ? "/sce/rp/session/ctrl" // PS4 with system version < 8.0
        : typedPath(device, "/sie/:type/rp/sess/ctrl");

    return urlWith(device, path);
}

async function openControlSocket(
    device: IDiscoveredDevice,
    creds: IRemotePlayCredentials,
    nonce: Buffer,
) {
    const codec = new RemotePlayPacketCodec(
        pickCryptoStrategyForDevice(device),
        creds,
        nonce,
    );

    const registKey = creds.registration["PS5-RegistKey"]
        ?? creds.registration["PS4-RegistKey"];
    if (!registKey) {
        throw new Error("Missing RegistKey?");
    }

    // "device ID"? Seems to just be random bytes with some
    // prefix and suffix
    const did = Buffer.concat([
        DID_PREFIX,
        Buffer.alloc(16),
        DID_SUFFIX,
    ]);

    function encrypt(data: Buffer) {
        return codec.encodeBuffer(data).toString("base64");
    }

    const version = remotePlayVersionFor(device);
    const headers: Record<string, string> = {
        "RP-Auth": encrypt(parseHexBytes(registKey)),
        "RP-Version": remotePlayVersionToString(version),
        "RP-Did": encrypt(did),
        "RP-ControllerType": "3",
        "RP-ClientType": "11",
        "RP-OSType": encrypt(Buffer.from(OS_TYPE, "utf-8")),
        "RP-ConPath": "1",
    };

    if (version >= RemotePlayVersion.PS4_10) {
        headers["RP-StartBitrate"] = encrypt(Buffer.alloc(4, 0));

        const typeBuffer = Buffer.alloc(4, 0);
        typeBuffer.writeInt32LE(1);
        headers["RP-StreamingType"] = encrypt(typeBuffer);
    }

    const agent = new http.Agent({
        keepAlive: true,
        timeout: 30_000,
    });

    debug("sending session control request...");
    const response = await request(urlFor(device), {
        agent: {
            http: agent,
        },
        headers,
    });

    function decrypt(map: http.IncomingHttpHeaders, name: string) {
        const value = map[name];
        if (typeof value !== "string") {
            throw new Error(`Missing required response header ${name}`);
        }

        return codec.decodeBuffer(Buffer.from(value, "base64"));
    }

    const serverType = decrypt(response.headers, "rp-server-type");
    debug("received server type=", serverType);

    const { socket } = response;

    const deviceSocket = new TcpDeviceSocket(device, RemotePlayDeviceProtocol, socket);
    deviceSocket.setCodec(codec);
    return deviceSocket;
}

export async function openSession(
    device: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: IRemotePlayCredentials,
) {
    const nonce = await initializeSession(device, creds);
    const socket = await openControlSocket(device, creds, nonce);

    debug("TODO: login via", config);

    return new RemotePlaySession(
        config,
        socket,
    );
}
