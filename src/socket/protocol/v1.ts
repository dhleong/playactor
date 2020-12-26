import {
    IDeviceProtocol,
    IPacket,
    IPacketCodec,
    IPacketReader,
    PacketReadState,
} from "../model";
import { ServerHelloPacket } from "../packets/incoming/server-hello";
import { PacketType } from "../packets/types";

const PACKET_TYPE_OFFSET = 4;

interface PacketConstructor {
    new (data: Buffer): IPacket;
}
const packets: {[key: number]: PacketConstructor} = {
    [PacketType.Hello]: ServerHelloPacket,
};

export class PacketReaderV1 implements IPacketReader {
    private currentBuffer?: Buffer;

    public read(data: Buffer): PacketReadState {
        if (this.currentBuffer) {
            this.currentBuffer = Buffer.concat([this.currentBuffer, data]);
        } else {
            this.currentBuffer = data;
        }

        if (this.currentBuffer.length >= this.expectedLength) {
            return PacketReadState.DONE;
        }

        return PacketReadState.PENDING;
    }

    public get(codec: IPacketCodec): IPacket {
        const original = this.currentBuffer;
        if (!original) throw new Error("Invalid state: no buffer read");

        const buf = codec.decode(original);
        const type = buf.readInt32LE(PACKET_TYPE_OFFSET);
        const Constructor = packets[type];
        if (!Constructor) {
            // TODO we could perhaps do this in read() and just abandon
            // unsupported packet types
            throw new Error("Unsupported packet type");
        }

        return new Constructor(buf);
    }

    public remainder(): Buffer | undefined {
        const data = this.currentBuffer;
        if (!data) throw new Error("Illegal state: no buffer read");

        const expected = this.expectedLength;
        if (expected < data.byteLength) {
            return data.slice(expected);
        }
    }

    private get expectedLength() {
        const buffer = this.currentBuffer;
        if (!buffer) throw new Error("Unable to derive length without a buffer");

        return buffer.readInt32LE(0);
    }
}

export const DeviceProtocolV1: IDeviceProtocol = {
    version: 0x0201, // seems to be [minor,major] as shorts

    createPacketReader(): IPacketReader {
        return new PacketReaderV1();
    },
};
