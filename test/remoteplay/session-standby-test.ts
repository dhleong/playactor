import * as chai from "chai";
import net from "net";
import sinon from "sinon";

import { RemotePlayDeviceConnection } from "../../src/connection/remoteplay";
import { IRemotePlayCredentials } from "../../src/credentials/model";
import { ConnectionIntent } from "../../src/device/model";
import {
    DeviceStatus,
    DeviceType,
    DiscoveryVersions,
    IDiscoveredDevice,
} from "../../src/discovery/model";
import { RemotePlayPacketCodec } from "../../src/remoteplay/codec";
import { pickCryptoStrategyForDevice } from "../../src/remoteplay/crypto";
import { RemotePlayCommand } from "../../src/remoteplay/packets";
import * as protocol from "../../src/remoteplay/protocol";
import { openSession } from "../../src/remoteplay/session";

chai.should();

const REGIST_KEY = "00112233445566778899aabbccddeeff";

/**
 * A local console that accepts the HTTP control handshake but never
 * acknowledges Login, as on the PS5 recovery screen.
 */
async function startSilentConsole(serverType: string) {
    const commands: number[] = [];
    const sockets = new Set<net.Socket>();

    const server = net.createServer(socket => {
        sockets.add(socket);
        socket.setNoDelay(true);
        socket.on("error", () => {});
        socket.on("close", () => sockets.delete(socket));

        let buffer = Buffer.alloc(0);
        let requestComplete = false;
        let closing = false;

        socket.on("data", data => {
            buffer = Buffer.concat([buffer, data]);

            if (!requestComplete) {
                const end = buffer.indexOf("\r\n\r\n");

                if (end === -1) {
                    return;
                }

                requestComplete = true;
                buffer = buffer.slice(end + 4);

                socket.write(
                    "HTTP/1.1 200 OK\r\n"
                    + "Content-Length: 0\r\n"
                    + "Connection: keep-alive\r\n"
                    + `RP-Server-Type: ${serverType}\r\n\r\n`,
                );
            }

            while (buffer.length >= 8) {
                const length = buffer.readUInt32BE(0);

                if (buffer.length < 8 + length) {
                    return;
                }

                const command = buffer.readUInt16BE(4);
                commands.push(command);
                buffer = buffer.slice(8 + length);

                if (!closing) {
                    closing = true;

                    if (command === RemotePlayCommand.Standby) {
                        // The console closes as it enters Rest Mode.
                        setTimeout(() => socket.end(), 10);
                    } else {
                        // Unexpected Login is never acknowledged.
                        setTimeout(() => socket.destroy(), 10);
                    }
                }
            }
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
        throw new Error("Invalid local test server address");
    }

    return {
        port: address.port,
        commands,
        close: async () => {
            sockets.forEach(socket => socket.destroy());

            await new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        },
    };
}

describe("Remote Play session", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("sends Standby without logging in", async () => {
        const device: IDiscoveredDevice = {
            address: { address: "127.0.0.1", port: 9295, family: "IPv4" },
            hostRequestPort: 997,
            extras: {},
            discoveryVersion: DiscoveryVersions.PS5,
            systemVersion: "14100003",
            id: "0123456789AB",
            name: "PS5",
            status: DeviceStatus.AWAKE,
            type: DeviceType.PS5,
        };
        const creds: IRemotePlayCredentials = {
            "app-type": "r",
            "auth-type": "R",
            "client-type": "vr",
            "user-credential": "1234567890",
            accountId: "1234567890",
            registration: {
                "AP-Bssid": "0123456789ab",
                "AP-Name": "PS5",
                "PS5-RegistKey": REGIST_KEY,
                "RP-KeyType": "2",
                "RP-Key": REGIST_KEY,
            },
        };

        const nonce = Buffer.alloc(16, 0x42);
        const serverCodec = new RemotePlayPacketCodec(
            pickCryptoStrategyForDevice(device),
            creds,
            nonce,
        );
        const serverType = serverCodec.encodeBuffer(Buffer.alloc(16, 0));
        const console = await startSilentConsole(
            serverType.toString("base64"),
        );

        try {
            // Initialisation still uses the existing protocol.request API.
            sinon.stub(protocol, "request").resolves({
                headers: { "rp-nonce": nonce.toString("base64") },
            } as any);

            // Only the control request uses native http.request.
            sinon.stub(protocol, "urlWith").callsFake((_device, path) => (
                `http://127.0.0.1:${console.port}${path}`
            ));

            const session = await openSession(device, {
                intent: ConnectionIntent.STANDBY,
            }, creds);

            try {
                await new RemotePlayDeviceConnection(session).standby();
            } finally {
                await session.close();
            }

            // Must not have sent Login:
            console.commands.should.deep.equal([RemotePlayCommand.Standby]);
        } finally {
            await console.close();
        }
    });
});
