import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSubset from "chai-subset";

import { FakeSocket } from "../util";
import { OpenKeyboardProc } from "../../../src/socket/proc/open-keyboard";
import { OskStartResultPacket } from "../../../src/socket/packets/incoming/osk-start-result";
import { PacketBuilder } from "../../../src/socket/packets/builder";
import { PacketType } from "../../../src/socket/packets/types";
import { OskActionType } from "../../../src/socket/osk";

chai.use(chaiAsPromised);
chai.use(chaiSubset);
chai.should();

describe("OpenKeyboardProc", () => {
    let sock: FakeSocket;
    let proc: OpenKeyboardProc;

    beforeEach(() => {
        sock = new FakeSocket();
        proc = new OpenKeyboardProc();
    });

    it("works as expected", async () => {
        sock.enqueued = [
            new OskStartResultPacket(
                new PacketBuilder(36)
                    .writeInt(PacketType.OskStartResult)
                    .writeInt(0) // result
                    .writeInt(0x030) // type
                    .writeInt(42) // max length
                    .build(),
            ),
        ];

        const result = await proc.perform(sock);
        sock.sent.should.have.lengthOf(1);

        expect(result).to.not.be.undefined;
        result.should.containSubset({
            actionType: OskActionType.Go,
            maxLength: 42,
        });
    });
});
