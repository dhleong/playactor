import * as chai from "chai";
import net from "net";
import { Duplex } from "stream";
import sinon from "sinon";

import { DeviceType } from "../../src/discovery/model";
import { RemotePlayPacketCodec } from "../../src/remoteplay/codec";
import { pickCryptoStrategyForDevice } from "../../src/remoteplay/crypto";
import { RemotePlayCommand } from "../../src/remoteplay/packets";
import * as protocol from "../../src/remoteplay/protocol";
import { openSession } from "../../src/remoteplay/session";
import { fakeRemotePlayCredentials, fakeRemotePlayDevice } from "./util";

class FakeControlSocket extends Duplex {
    public readonly written: Buffer[] = [];

    constructor(
        private readonly loginReply: Buffer,
    ) {
        super();
    }

    // Required by the Node.js Duplex stream API.
    // eslint-disable-next-line no-underscore-dangle
    public _read() {
        // Data is supplied by the simulated console.
    }

    // Required by the Node.js Duplex stream API.
    // eslint-disable-next-line no-underscore-dangle
    public _write(
        data: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ) {
        this.written.push(Buffer.from(data));
        callback();

        if (data.length === 8
            && data.readUInt16BE(4) === RemotePlayCommand.Login) {
            setImmediate(() => {
                this.push(this.loginReply);
            });
        }
    }

    public setTimeout() {
        return this;
    }

    public ref() {
        return this;
    }

    public unref() {
        return this;
    }
}

const devices = [
    {
        name: "PS5",
        type: DeviceType.PS5,
        systemVersion: "14100003",
        initPath: "/sie/ps5/rp/sess/init",
        controlPath: "/sie/ps5/rp/sess/ctrl",
        remotePlayVersion: "1.0",
    },
    {
        name: "PS4 with Remote Play 10.0",
        type: DeviceType.PS4,
        systemVersion: "11000000",
        initPath: "/sie/ps4/rp/sess/init",
        controlPath: "/sie/ps4/rp/sess/ctrl",
        remotePlayVersion: "10.0",
    },
    {
        name: "PS4 with Remote Play 9.0",
        type: DeviceType.PS4,
        systemVersion: "07000000",
        initPath: "/sce/rp/session",
        controlPath: "/sce/rp/session/ctrl",
        remotePlayVersion: "9.0",
    },
    {
        name: "PS4 with Remote Play 8.0",
        type: DeviceType.PS4,
        systemVersion: "06000000",
        initPath: "/sce/rp/session",
        controlPath: "/sce/rp/session/ctrl",
        remotePlayVersion: "8.0",
    },
];

describe("RemotePlay session control connection", () => {
    afterEach(() => {
        sinon.restore();
    });

    for (const testDevice of devices) {
        it(`hands an independent TCP socket to Remote Play on ${testDevice.name}`, async () => {
            const device = fakeRemotePlayDevice(
                testDevice.type,
                testDevice.systemVersion,
            );

            const credentials = fakeRemotePlayCredentials(
                testDevice.type,
            );

            const nonce = Buffer.alloc(16, 0x42);

            const init = sinon.stub(protocol, "request").resolves({
                headers: {
                    "rp-nonce": nonce.toString("base64"),
                },
            } as any);

            const serverCodec = new RemotePlayPacketCodec(
                pickCryptoStrategyForDevice(device),
                credentials,
                nonce,
            );

            const serverType = Buffer.alloc(16);
            serverType[0] = 2;

            // The first encrypted response contains the server type.
            const encryptedServerType = serverCodec
                .encodeBuffer(serverType)
                .toString("base64");

            // The second encrypted response confirms successful login.
            const encryptedLoginResult = serverCodec.encodeBuffer(
                Buffer.from([0x00]),
            );

            const loginReplyHeader = Buffer.alloc(8);
            loginReplyHeader.writeUInt32BE(
                encryptedLoginResult.length,
                0,
            );
            loginReplyHeader.writeUInt16BE(
                RemotePlayCommand.Login,
                4,
            );

            const loginReply = Buffer.concat([
                loginReplyHeader,
                encryptedLoginResult,
            ]);

            // Include a heartbeat in the same TCP chunk as the
            // HTTP headers to exercise the socket handover.
            const heartbeat = Buffer.from([
                0x00, 0x00, 0x00, 0x00,
                0x00, 0xfe, 0x00, 0x00,
            ]);

            const response = Buffer.concat([
                Buffer.from(
                    "HTTP/1.1 200 OK\r\n"
                    + `RP-Server-Type: ${encryptedServerType}\r\n\r\n`,
                ),
                heartbeat,
            ]);

            const stream = new FakeControlSocket(loginReply);

            const connect = sinon.stub(net, "createConnection")
                .callsFake(() => {
                    setImmediate(() => {
                        stream.emit("connect");
                        stream.push(response);
                    });

                    return stream as unknown as net.Socket;
                });

            const connection = await openSession(
                device,
                {},
                credentials,
            );

            // Verify the correct protocol endpoint was requested.
            chai.expect(init.calledOnce).to.equal(true);
            chai.expect(init.firstCall.args[0]).to.equal(
                `http://127.0.0.1:9295${testDevice.initPath}`,
            );

            const controlRequest = stream.written[0].toString("utf-8");

            chai.expect(controlRequest).to.include(
                `GET ${testDevice.controlPath} HTTP/1.1\r\n`,
            );

            chai.expect(controlRequest).to.include(
                `RP-Version: ${testDevice.remotePlayVersion}\r\n`,
            );

            // The dedicated socket must remain available to
            // Remote Play after the HTTP handshake.
            chai.expect(connect.calledOnce).to.equal(true);
            chai.expect(connection.isConnected).to.equal(true);
            chai.expect(stream.destroyed).to.equal(false);
            chai.expect(stream.listenerCount("data")).to.equal(1);

            const packets = stream.written.filter(
                data => data.length === 8,
            );

            chai.expect(packets.some(
                data => data.readUInt16BE(4) === RemotePlayCommand.Login,
            )).to.equal(true);

            chai.expect(packets.some(
                data => data.readUInt16BE(4) === RemotePlayCommand.Heartbeat,
            )).to.equal(true);

            await connection.close();

            chai.expect(stream.destroyed).to.equal(true);
        });
    }
});
