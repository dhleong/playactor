import * as chai from "chai";
import { Duplex } from "stream";
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
 * A control socket for a console that never answers the login request,
 * like a PS5 showing the "not turned off properly" dialog.
 */
class SilentControlSocket extends Duplex {
    public readonly written: Buffer[] = [];

    public get commands() {
        return this.written
            .filter(data => data.length >= 8)
            .map(data => data.readUInt16BE(4));
    }

    // eslint-disable-next-line no-underscore-dangle
    public _read() {
        // the console pushes data from the test
    }

    // eslint-disable-next-line no-underscore-dangle
    public _write(
        data: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ) {
        this.written.push(Buffer.from(data));
        callback();

        if (data.readUInt16BE(4) === RemotePlayCommand.Standby) {
            // the console closes the connection as it goes to rest
            setImmediate(() => this.push(null));
        }
    }

    public ref() {
        return this;
    }

    public unref() {
        return this;
    }
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
        const socket = new SilentControlSocket();

        const request = sinon.stub(protocol, "request");
        request.onFirstCall().resolves({
            headers: { "rp-nonce": nonce.toString("base64") },
            request: { socket },
        } as any);
        request.onSecondCall().resolves({
            headers: { "rp-server-type": serverType.toString("base64") },
            request: { socket },
        } as any);

        const session = await openSession(device, {
            intent: ConnectionIntent.STANDBY,
        }, creds);
        await new RemotePlayDeviceConnection(session).standby();

        // Must not have sent Login:
        socket.commands.should.deep.equal([RemotePlayCommand.Standby]);
    });
});
