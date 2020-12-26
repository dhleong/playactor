import {
    IDeviceProtocol,
    IPacket,
    IPacketCodec,
    IPacketReader,
    PacketReadState,
} from "../model";
import { ServerHelloPacket } from "../packets/incoming/server-hello";
import { PacketType } from "../packets/types";
import { LengthDelimitedBufferReader } from "./base";

const PACKET_TYPE_OFFSET = 4;

interface PacketConstructor {
    new (data: Buffer): IPacket;
}
const packets: {[key: number]: PacketConstructor} = {
    [PacketType.Hello]: ServerHelloPacket,
};

export class PacketReaderV1 implements IPacketReader {
    private readonly lengthDelimiter = new LengthDelimitedBufferReader();

    public read(data: Buffer): PacketReadState {
        return this.lengthDelimiter.read(data);
    }

    public get(codec: IPacketCodec): IPacket {
        const original = this.lengthDelimiter.get();
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
        return this.lengthDelimiter.remainder();
    }
}

export const DeviceProtocolV1: IDeviceProtocol = {
    version: 0x0201, // seems to be [minor,major] as shorts

    createPacketReader(): IPacketReader {
        return new PacketReaderV1();
    },
};
