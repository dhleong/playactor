import _debug from "debug";

import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { IDiscoveredDevice } from "../discovery/model";
import { CRYPTO_NONCE_LENGTH } from "./crypto";
import { RemotePlayVersion, remotePlayVersionFor, remotePlayVersionToString } from "./model";
import { request, typedPath, urlWith } from "./protocol";

const debug = _debug("playactor:remoteplay:session");

export enum RemotePlayCommand {
    STANDBY = 0x50,
}

export class RemotePlaySession {
    constructor(
        // FIXME: these probably are only public to satisfy typescript
        public readonly discovered: IDiscoveredDevice,
        public readonly config: IConnectionConfig,
        public readonly creds: IRemotePlayCredentials,
    ) {}

    public async sendCommand(command: RemotePlayCommand) {
        debug("TODO: send", command);
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
        creds,
    );
}

export function registKeyToHex(registKey: string) {
    // this is so bizarre, but here it is:
    const buffer = Buffer.alloc(registKey.length / 2);
    for (let i = 0; i < registKey.length; i += 2) {
        // 1. Every 2 chars in registKey is interpreted as a hex byte
        const byteAsString = registKey.slice(i, i + 2);
        const byte = parseInt(byteAsString, 16);
        buffer.writeUInt8(byte, i / 2);
    }

    // 2. The bytes are treated as a utf-8-encoded string
    return buffer.toString("utf-8");
}
