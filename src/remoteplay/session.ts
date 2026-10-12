import _debug from "debug";
import net from "net";

import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { IDiscoveredDevice } from "../discovery/model";
import { TcpDeviceSocket } from "../socket/tcp";
import { delayMillis } from "../util/async";
import { RemotePlayPacketCodec } from "./codec";
import { parseControlResponse } from "./control-response";
import { pickCryptoStrategyForDevice } from "./crypto";
import { RemotePlayVersion, remotePlayVersionFor, remotePlayVersionToString } from "./model";
import { RemotePlayLoginProc } from "./proc/login";
import {
    CRYPTO_NONCE_LENGTH,
    padBuffer,
    parseHexBytes,
    RemotePlayDeviceProtocol, request, typedPath, urlWith,
    REST_PORT,
} from "./protocol";

const debug = _debug("playactor:remoteplay:session");

const DID_PREFIX = Buffer.from([
    0x00, 0x18, 0x00, 0x00, 0x00, 0x07, 0x00, 0x40, 0x00, 0x80,
]);
const DID_SUFFIX = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const OS_TYPE = "Win10.0.0";

const CONTROL_CONNECT_TIMEOUT = 15_000;

/**
 * Step 1: initialize the session and fetch the server nonce.
 *
 * This is an ordinary HTTP request. The connection is not needed
 * after the response, so the existing HTTP client can handle it.
 */
async function initializeSession(
    device: IDiscoveredDevice,
    creds: IRemotePlayCredentials,
) {
    const version = remotePlayVersionFor(device);
    const path = version < RemotePlayVersion.PS4_10
        ? "/sce/rp/session"
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

function controlPathFor(device: IDiscoveredDevice) {
    const version = remotePlayVersionFor(device);

    return version < RemotePlayVersion.PS4_10
        ? "/sce/rp/session/ctrl"
        : typedPath(device, "/sie/:type/rp/sess/ctrl");
}

/**
 * Step 2: establish the Remote Play control connection.
 *
 * The control endpoint starts with HTTP but continues using a
 * binary protocol over the same TCP connection.
 *
 * A normal HTTP client can return the connection to its agent,
 * unreference it or destroy it after the HTTP response finishes.
 *
 * Use a dedicated TCP socket instead. Read only the HTTP headers,
 * preserve any binary data received with them, and hand the socket
 * directly to TcpDeviceSocket.
 */
async function openControlSocket(
    device: IDiscoveredDevice,
    creds: IRemotePlayCredentials,
    nonce: Buffer,
): Promise<TcpDeviceSocket> {
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

    const did = Buffer.concat([
        DID_PREFIX,
        Buffer.alloc(16),
        DID_SUFFIX,
    ]);

    function encrypt(data: Buffer) {
        return codec.encodeBuffer(data).toString("base64");
    }

    const version = remotePlayVersionFor(device);

    // Preserve the original encryption order. These calls advance
    // the Remote Play encryption counter.
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

    const host = device.address.address;
    const path = controlPathFor(device);

    const requestLines = [
        `GET ${path} HTTP/1.1`,
        `Host: ${host}:${REST_PORT}`,
        "User-Agent: remoteplay Windows",
        "Connection: keep-alive",
        ...Object.keys(headers).map(name => `${name}: ${headers[name]}`),
        "Content-Length: 0",
        "",
        "",
    ];

    const requestText = requestLines.join("\r\n");

    debug("sending session control request...");

    return new Promise<TcpDeviceSocket>((resolve, reject) => {
        const stream = net.createConnection({
            host,
            port: REST_PORT,
        });

        let received = Buffer.alloc(0);
        let finished = false;
        let cleanup: () => void;

        function fail(error: Error) {
            if (finished) {
                return;
            }

            finished = true;
            cleanup();
            stream.destroy();
            reject(error);
        }

        function onConnect() {
            debug("session control TCP connection established");
            stream.write(requestText);
        }

        function onError(error: Error) {
            fail(error);
        }

        function onEnd() {
            fail(new Error(
                "Remote Play console closed the session control connection before responding",
            ));
        }

        function onClose() {
            fail(new Error(
                "Remote Play session control connection closed unexpectedly",
            ));
        }

        function onTimeout() {
            fail(new Error(
                "Timed out waiting for the Remote Play session control response",
            ));
        }

        function onData(data: Buffer) {
            if (finished) {
                return;
            }

            received = Buffer.concat([received, data]);

            try {
                const response = parseControlResponse(received);

                if (!response) {
                    return;
                }

                // Stop reading while the socket changes ownership.
                stream.pause();

                const serverType = codec.decodeBuffer(
                    Buffer.from(response.encryptedServerType, "base64"),
                );

                debug("received server type=", serverType);

                // Preserve binary packets received alongside HTTP headers.
                if (response.remainingData.length > 0) {
                    debug(
                        "preserving",
                        response.remainingData.length,
                        "bytes received after HTTP headers",
                    );
                    stream.unshift(response.remainingData);
                }

                // Remove only the HTTP-handshake listeners.
                cleanup();

                const connection = new TcpDeviceSocket(
                    device,
                    RemotePlayDeviceProtocol,
                    stream,
                    { refSocket: true },
                    codec,
                );

                finished = true;

                debug("session control socket handed over to Remote Play");

                // TcpDeviceSocket now owns incoming binary packets.
                stream.resume();

                resolve(connection);
            } catch (error) {
                fail(error instanceof Error
                    ? error
                    : new Error(String(error)));
            }
        }

        cleanup = () => {
            stream.removeListener("connect", onConnect);
            stream.removeListener("data", onData);
            stream.removeListener("error", onError);
            stream.removeListener("end", onEnd);
            stream.removeListener("close", onClose);
            stream.removeListener("timeout", onTimeout);
            stream.setTimeout(0);
        };

        stream.once("connect", onConnect);
        stream.on("data", onData);
        stream.once("error", onError);
        stream.once("end", onEnd);
        stream.once("close", onClose);
        stream.once("timeout", onTimeout);

        stream.setTimeout(CONTROL_CONNECT_TIMEOUT);
    });
}

/**
 * Step 3: authenticate the Remote Play session.
 */
export async function openSession(
    device: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: IRemotePlayCredentials,
) {
    const nonce = await initializeSession(device, creds);

    // Allow the console to release the initial HTTP connection.
    // This delay resolved the TCP connection reset under Node.js 24.
    debug("waiting 200ms before opening session control connection...");
    await delayMillis(200);

    const socket = await openControlSocket(device, creds, nonce);

    await socket.execute(new RemotePlayLoginProc(config));

    debug("RemotePlaySession ready!");
    return socket;
}
