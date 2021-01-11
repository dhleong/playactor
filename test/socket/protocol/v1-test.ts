import * as chai from "chai";

import { IPacketReader, PacketReadState, PlaintextCodec } from "../../../src/socket/model";
import { IncomingPacket } from "../../../src/socket/packets/base";
import { PacketBuilder } from "../../../src/socket/packets/builder";
import { DeviceProtocolV1 } from "../../../src/socket/protocol/v1";

chai.should();

describe("PacketReaderV1", () => {
    let reader: IPacketReader;

    beforeEach(() => {
        reader = DeviceProtocolV1.createPacketReader();
    });

    it("gracefully handles unsupported packets", () => {
        reader.read(
            PlaintextCodec,
            new PacketBuilder(8)
                .writeInt(-9001)
                .build(),
        ).should.equal(PacketReadState.DONE);

        reader.get(PlaintextCodec).should.be.instanceOf(IncomingPacket);
    });
});
