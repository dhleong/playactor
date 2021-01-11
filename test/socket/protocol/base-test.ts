import * as chai from "chai";
import { expect } from "chai";
import { PacketReadState } from "../../../src/socket/model";

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
            new PacketBuilder(8)
                .writeInt(42)
                .build(),
        ).should.equal(PacketReadState.DONE);
        expect(reader.remainder()).to.be.undefined;
    });

    it("strips excess padding", () => {
        const padded = Buffer.alloc(16);
        padded.writeInt32LE(8);
        reader.read(
            padded,
            16,
        ).should.equal(PacketReadState.DONE);
        expect(reader.get()).to.have.lengthOf(8);
        expect(reader.remainder()).to.be.undefined;
    });

    it("waits for the complete packet", () => {
        const header = Buffer.alloc(4);
        header.writeInt32LE(8);
        reader.read(header).should.equal(PacketReadState.PENDING);
        reader.read(header).should.equal(PacketReadState.DONE);

        reader.get().should.deep.equal(
            new PacketBuilder(8)
                .writeInt(8)
                .build(),
        );
        expect(reader.remainder()).to.be.undefined;
    });

    it("returns overflow in remainder", () => {
        reader.read(
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
