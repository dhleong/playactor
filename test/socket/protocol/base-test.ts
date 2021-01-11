import * as chai from "chai";
import { expect } from "chai";
import { PacketReadState, PlaintextCodec } from "../../../src/socket/model";

import { PacketBuilder } from "../../../src/socket/packets/builder";
import { LengthDelimitedBufferReader } from "../../../src/socket/protocol/base";

chai.should();

describe("LengthDelimitedBufferReader", () => {
    let reader: LengthDelimitedBufferReader;
    beforeEach(() => {
        reader = new LengthDelimitedBufferReader();
    });

    it("handles a complete packet correctly", () => {
        reader.read(
            PlaintextCodec,
            new PacketBuilder(8)
                .writeInt(42)
                .build(),
        ).should.equal(PacketReadState.DONE);
        expect(reader.remainder()).to.be.undefined;
    });

    it("waits for the complete packet", () => {
        const header = Buffer.alloc(4);
        header.writeInt32LE(8);
        reader.read(PlaintextCodec, header).should.equal(PacketReadState.PENDING);
        reader.read(PlaintextCodec, header).should.equal(PacketReadState.DONE);

        reader.get().should.deep.equal(
            new PacketBuilder(8)
                .writeInt(8)
                .build(),
        );
        expect(reader.remainder()).to.be.undefined;
    });

    it("returns overflow in remainder", () => {
        reader.read(
            PlaintextCodec,
            Buffer.concat([
                new PacketBuilder(8)
                    .writeInt(42)
                    .build(),
                new PacketBuilder(8)
                    .writeInt(9001)
                    .build(),
            ]),
        ).should.equal(PacketReadState.DONE);

        reader.get().should.deep.equal(
            new PacketBuilder(8)
                .writeInt(42)
                .build(),
        );
        expect(reader.remainder()).to.deep.equal(
            new PacketBuilder(8)
                .writeInt(9001)
                .build(),
        );
    });
});
