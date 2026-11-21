import * as chai from "chai";
import net from "net";
import sinon from "sinon";

import { IRemotePlayCredentials } from "../../src/credentials/model";
import {
    DeviceStatus,
    DeviceType,
    DiscoveryVersions,
    IDiscoveredDevice,
} from "../../src/discovery/model";
import { RemotePlayPacketCodec } from "../../src/remoteplay/codec";
import { pickCryptoStrategyForDevice } from "../../src/remoteplay/crypto";
import { RemotePlayCommand, RemotePlayOutgoingPacket } from "../../src/remoteplay/packets";
import { RemotePlayLoginProc } from "../../src/remoteplay/proc/login";
import * as protocol from "../../src/remoteplay/protocol";
import { openSession } from "../../src/remoteplay/session";
import { TcpDeviceSocket } from "../../src/socket/tcp";

const HEARTBEAT = Buffer.from("0000000000fe0000", "hex");
const REGISTRATION_KEY = "00112233445566778899aabbccddeeff";

function fixture() {
    const device: IDiscoveredDevice = {
        id: "0123456789AB",
        name: "PS5",
        status: DeviceStatus.AWAKE,
        discoveryVersion: DiscoveryVersions.PS5,
        hostRequestPort: 997,
        extras: {},
        type: DeviceType.PS5,
        systemVersion: "14100003",
        address: { address: "127.0.0.1", port: 9295, family: "IPv4" },
    };

    const credentials: IRemotePlayCredentials = {
        "app-type": "r",
        "auth-type": "R",
        "client-type": "vr",
        "user-credential": "test",
        accountId: "test",
        registration: {
            "AP-Bssid": "test",
            "AP-Name": DeviceType.PS5,
            "RP-KeyType": "2",
            "RP-Key": REGISTRATION_KEY,
            "PS5-RegistKey": REGISTRATION_KEY,
        },
    };

    const nonce = Buffer.alloc(16, 0x42);

    sinon.stub(protocol, "request").resolves({
        headers: { "rp-nonce": nonce.toString("base64") },
    } as any);

    return { device, credentials, nonce };
}

async function startConsole(response: string) {
    const sockets = new Set<net.Socket>();
    let requestText = "";
    let firstBinary: Buffer | undefined;
    let notifyClientClosed: (() => void) | undefined;

    const clientClosed = new Promise<void>(resolve => {
        notifyClientClosed = resolve;
    });

    const server = net.createServer(socket => {
        sockets.add(socket);
        socket.setNoDelay(true);
        socket.on("error", () => {});
        socket.on("close", () => {
            sockets.delete(socket);
            notifyClientClosed?.();
        });

        let buffer = Buffer.alloc(0);
        let binaryBuffer = Buffer.alloc(0);
        let requestComplete = false;

        socket.on("data", data => {
            if (requestComplete) {
                if (!firstBinary) {
                    binaryBuffer = Buffer.concat([binaryBuffer, data]);

                    if (binaryBuffer.length >= 8) {
                        const payloadLength = binaryBuffer.readUInt32BE(0);

                        if (binaryBuffer.length >= 8 + payloadLength) {
                            firstBinary = Buffer.from(
                                binaryBuffer.subarray(0, 8 + payloadLength),
                            );
                            socket.write(HEARTBEAT);
                        }
                    }
                }
                return;
            }

            buffer = Buffer.concat([buffer, data]);
            const end = buffer.indexOf("\r\n\r\n");

            if (end === -1) {
                return;
            }

            requestComplete = true;
            requestText = buffer.subarray(0, end + 4).toString("latin1");
            socket.write(response);
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });

    const address = server.address();

    if (!address || typeof address === "string") {
        throw new Error("Invalid test server address");
    }

    return {
        port: address.port,
        getRequest: () => requestText,
        getBinary: () => firstBinary,
        whenClientClosed: () => clientClosed,
        close: async () => {
            sockets.forEach(socket => socket.destroy());
            await new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        },
    };
}

async function receiveWithin<T>(promise: Promise<T>) {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error("Binary response timeout"));
        }, 1500);
    });

    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

describe("Remote Play HTTP-agent handover", function httpAgentHandover() {
    this.timeout(5000);

    afterEach(() => sinon.restore());

    it("hands a client-first binary exchange to TcpDeviceSocket", async () => {
        const { device, credentials, nonce } = fixture();

        const serverCodec = new RemotePlayPacketCodec(
            pickCryptoStrategyForDevice(device),
            credentials,
            nonce,
        );

        const serverType = Buffer.alloc(16);
        serverType[0] = 2;

        const encrypted = serverCodec.encodeBuffer(serverType)
            .toString("base64");

        const server = await startConsole(
            "HTTP/1.1 200 OK\r\n"
            + "Content-Length: 0\r\n"
            + "Connection: keep-alive\r\n"
            + `RP-Server-Type: ${encrypted}\r\n\r\n`,
        );

        let connection: TcpDeviceSocket | undefined;

        try {
            sinon.stub(protocol, "urlWith").callsFake((_device, path) => (
                `http://127.0.0.1:${server.port}${path}`
            ));

            // Verify the transport without requiring a simulated Login RPC.
            sinon.stub(RemotePlayLoginProc.prototype, "perform").resolves();

            connection = await openSession(device, {}, credentials);

            chai.expect(connection.isConnected).to.equal(true);
            chai.expect(server.getRequest()).to.include(
                "GET /sie/ps5/rp/sess/ctrl HTTP/1.1",
            );

            const receiver = connection.receive()[
                Symbol.asyncIterator
            ]();

            const nextPacket = receiver.next().then(result => {
                if (result.done) {
                    throw new Error("Socket closed before binary response");
                }
                return result.value.toBuffer();
            });

            await connection.send(
                new RemotePlayOutgoingPacket(RemotePlayCommand.Heartbeat),
            );

            const received = await receiveWithin(nextPacket);

            chai.expect(received).to.deep.equal(HEARTBEAT);
            chai.expect(server.getBinary()?.readUInt16BE(4))
                .to.equal(RemotePlayCommand.Heartbeat);
        } finally {
            if (connection) {
                await connection.close();
            }
            await server.close();
        }
    });

    it("rejects an HTTP 403 control response", async () => {
        const { device, credentials } = fixture();

        const server = await startConsole(
            "HTTP/1.1 403 Forbidden\r\n"
            + "Content-Length: 0\r\n"
            + "Connection: keep-alive\r\n\r\n",
        );

        try {
            sinon.stub(protocol, "urlWith").callsFake((_device, path) => (
                `http://127.0.0.1:${server.port}${path}`
            ));

            let error: Error | undefined;

            try {
                await openSession(device, {}, credentials);
            } catch (caught) {
                error = caught as Error;
            }

            chai.expect(error).to.be.instanceOf(Error);
            chai.expect(error?.message).to.include(
                "Remote Play control HTTP 403",
            );

            await receiveWithin(server.whenClientClosed());
        } finally {
            await server.close();
        }
    });

    it("rejects a missing RP-Server-Type and closes the socket", async () => {
        const { device, credentials } = fixture();

        const server = await startConsole(
            "HTTP/1.1 200 OK\r\n"
            + "Content-Length: 0\r\n"
            + "Connection: keep-alive\r\n\r\n",
        );

        try {
            sinon.stub(protocol, "urlWith").callsFake((_device, path) => (
                `http://127.0.0.1:${server.port}${path}`
            ));

            let error: Error | undefined;

            try {
                await openSession(device, {}, credentials);
            } catch (caught) {
                error = caught as Error;
            }

            chai.expect(error).to.be.instanceOf(Error);
            chai.expect(error?.message).to.include(
                "Missing Remote Play RP-Server-Type header",
            );

            await receiveWithin(server.whenClientClosed());
        } finally {
            await server.close();
        }
    });

    it("rejects unexpected response framing and closes the socket", async () => {
        const { device, credentials } = fixture();

        const server = await startConsole(
            "HTTP/1.1 200 OK\r\n"
            + "Content-Length: 1\r\n"
            + "Connection: keep-alive\r\n"
            + "RP-Server-Type: AA==\r\n\r\n",
        );

        try {
            sinon.stub(protocol, "urlWith").callsFake((_device, path) => (
                `http://127.0.0.1:${server.port}${path}`
            ));

            let error: Error | undefined;

            try {
                await openSession(device, {}, credentials);
            } catch (caught) {
                error = caught as Error;
            }

            chai.expect(error).to.be.instanceOf(Error);
            chai.expect(error?.message).to.include(
                "Unexpected Remote Play HTTP response framing",
            );

            await receiveWithin(server.whenClientClosed());
        } finally {
            await server.close();
        }
    });
});
