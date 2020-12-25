import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { FakeSocket } from "../util";
import { HandshakeProc } from "../../../src/socket/proc/handshake";
import { ServerHelloPacket } from "../../../src/socket/packets/incoming/server-hello";
import { PacketBuilder } from "../../../src/socket/packets/builder";
import { PacketType } from "../../../src/socket/packets/types";

chai.should();
chai.use(chaiAsPromised);

describe("HandshakeProc", () => {
    let sock: FakeSocket;
    let proc: HandshakeProc;

    beforeEach(() => {
        sock = new FakeSocket();
        proc = new HandshakeProc();
    });

    it("works as expected", async () => {
        sock.enqueued = [
            new ServerHelloPacket(
                new PacketBuilder(36)
                    .writeInt(28)
                    .writeInt(PacketType.Hello)
                    .build(),
            ),
        ];

        await proc.perform(sock).should.eventually.be.fulfilled;

        sock.sent.should.have.lengthOf(2);
    });

    it("throws on handshake error", async () => {
        sock.enqueued = [
            new ServerHelloPacket(
                new PacketBuilder(36)
                    .writeInt(PacketType.Hello)
                    .writeInt(0) // version
                    .writeInt(9001) // status
                    .build(),
            ),
        ];

        await proc.perform(sock).should.eventually.be.rejected;
    });
});
