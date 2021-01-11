import * as chai from "chai";
import chaiSubset from "chai-subset";

import { BufferPacketProcessor } from "../../src/socket/base";
import {
    IDeviceProtocol,
    IPacket,
    IPacketCodec,
    IPacketReader,
    PacketReadState,
    PlaintextCodec,
} from "../../src/socket/model";
import { PacketBuilder } from "../../src/socket/packets/builder";
import { LengthDelimitedBufferReader } from "../../src/socket/protocol/base";

chai.use(chaiSubset);
chai.should();

class FakePacketReader implements IPacketReader {
    private readonly lengthDelimiter = new LengthDelimitedBufferReader();

    public read(codec: IPacketCodec, data: Buffer): PacketReadState {
        return this.lengthDelimiter.read(codec, data);
    }

    public get(codec: IPacketCodec): IPacket {
        const original = this.lengthDelimiter.get();
        const buffer = codec.decode(original);
        return {
            type: buffer.readInt32LE(4),
            toBuffer() { return buffer; },
        };
    }

    public remainder(): Buffer | undefined {
        return this.lengthDelimiter.remainder();
    }
}

const FakeProtocol: IDeviceProtocol = {
    version: { major: 0, minor: 0 },
    createPacketReader() {
        return new FakePacketReader();
    },
};

describe("BufferPacketProcessor", () => {
    let processor: BufferPacketProcessor;
    let received: IPacket[] = [];

    beforeEach(() => {
        received = [];
        processor = new BufferPacketProcessor(
            FakeProtocol,
            PlaintextCodec,
            packet => received.push(packet),
        );
    });

    it("handles receiving a partial header", () => {
        const first = new PacketBuilder(8)
            .writeInt(42)
            .build();
        processor.onDataReceived(
            first.slice(0, 2),
        );
        received.should.be.empty;

        processor.onDataReceived(
            first.slice(2),
        );
        received.should.containSubset([
            { type: 42 },
        ]);
    });

    it("handles receiving multiple packets at once", () => {
        const first = new PacketBuilder(8)
            .writeInt(42)
            .build();
        const second = new PacketBuilder(8)
            .writeInt(9001)
            .build();
        processor.onDataReceived(
            Buffer.concat([first, second]),
        );

        received.should.containSubset([
            { type: 42 },
            { type: 9001 },
        ]);
    });
});
