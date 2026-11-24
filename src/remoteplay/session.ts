import _debug from "debug";
import http from "http";
import net from "net";

import { IRemotePlayCredentials } from "../credentials/model";
import { ConnectionIntent, IConnectionConfig } from "../device/model";
import { IDiscoveredDevice } from "../discovery/model";
import { TcpDeviceSocket } from "../socket/tcp";
import { delayMillis } from "../util/async";
import { RemotePlayPacketCodec } from "./codec";
import { pickCryptoStrategyForDevice } from "./crypto";
import { RemotePlayVersion, remotePlayVersionFor, remotePlayVersionToString } from "./model";
import { RemotePlayLoginProc } from "./proc/login";
import {
    CRYPTO_NONCE_LENGTH,
    padBuffer,
    parseHexBytes,
    RemotePlayDeviceProtocol, request, typedPath, urlWith,
} from "./protocol";

const debug = _debug("playactor:remoteplay:session");

const DID_PREFIX = Buffer.from([
    0x00, 0x18, 0x00, 0x00, 0x00, 0x07, 0x00, 0x40, 0x00, 0x80,
]);
const DID_SUFFIX = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const OS_TYPE = "Win10.0.0";
const CONTROL_TIMEOUT_MS = 15_000;

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
        "RP-Auth": encrypt(padBuffer(parseHexBytes(registKey), CRYPTO_NONCE_LENGTH)),
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
        maxSockets: 1,
    });

    return new Promise<TcpDeviceSocket>((resolve, reject) => {
        let stream: net.Socket | undefined;
        let finished = false;

        const controlRequest = http.request(urlFor(device), {
            method: "GET",
            agent,
            headers: {
                "User-Agent": "remoteplay Windows",
                Connection: "keep-alive",
                ...headers,
                "Content-Length": "0",
            },
        });

        function fail(error: Error) {
            if (finished) {
                return;
            }

            finished = true;
            controlRequest.destroy();
            stream?.destroy();
            agent.destroy();
            reject(error);
        }

        controlRequest.once("socket", socket => {
            stream = socket;
            socket.emit("agentRemove");
        });

        controlRequest.once("response", response => {
            if (response.statusCode !== 200) {
                fail(new Error(
                    `Remote Play control HTTP ${response.statusCode}`,
                ));
                return;
            }

            const serverType = response.headers["rp-server-type"];

            if (typeof serverType !== "string") {
                fail(new Error("Missing Remote Play RP-Server-Type header"));
                return;
            }

            if (response.headers["content-length"] !== "0") {
                fail(new Error("Unexpected Remote Play HTTP response framing"));
                return;
            }

            response.once("error", fail);
            response.on("data", () => {
                fail(new Error("Unexpected HTTP control response body"));
            });

            response.once("end", () => {
                if (finished) {
                    return;
                }

                if (!stream || stream.destroyed) {
                    fail(new Error("Control socket closed before handover"));
                    return;
                }

                stream.pause();

                if (stream.listenerCount("data") !== 0) {
                    fail(new Error("HTTP parser still owns the control socket"));
                    return;
                }

                try {
                    const serverTypeDecoded = codec.decodeBuffer(
                        Buffer.from(serverType, "base64"),
                    );

                    debug("received server type=", serverTypeDecoded);

                    stream.setTimeout(0);

                    const connection = new TcpDeviceSocket(
                        device,
                        RemotePlayDeviceProtocol,
                        stream,
                        { refSocket: true },
                        codec,
                    );

                    finished = true;
                    stream.resume();
                    resolve(connection);
                } catch (error) {
                    fail(error instanceof Error
                        ? error
                        : new Error(String(error)));
                }
            });

            response.resume();
        });

        controlRequest.once("error", fail);

        controlRequest.setTimeout(CONTROL_TIMEOUT_MS, () => {
            fail(new Error(
                "Timed out waiting for the Remote Play control response",
            ));
        });

        controlRequest.end();
    });
}

export async function openSession(
    device: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: IRemotePlayCredentials,
) {
    const nonce = await initializeSession(device, creds);
    // Avoid racing the console immediately after session init.
    await delayMillis(1);
    const socket = await openControlSocket(device, creds, nonce);

    // The console accepts Standby without a login, and it never answers
    // the login request while it shows the "not turned off properly"
    // dialog after a power loss, so a standby session skips it.
    if (config.intent !== ConnectionIntent.STANDBY) {
        await socket.execute(new RemotePlayLoginProc(config));
    }

    debug("RemotePlaySession ready!");
    return socket;
}
