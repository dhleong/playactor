import {
    IDeviceProtocol,
    IDeviceSocket,
    IPacket,
    IPacketCodec,
    IPacketReader,
    PacketReadState,
} from "../model";
import { IncomingResultPacket } from "../packets/base";
import { LoginResultPacket } from "../packets/incoming/login-result";
import { ServerHelloPacket } from "../packets/incoming/server-hello";
import { StandbyResultPacket } from "../packets/incoming/standby-result";
import { UnsupportedIncomingPacket } from "../packets/incoming/unsupported";
import { ByePacket } from "../packets/outgoing/bye";
import { StatusPacket } from "../packets/outgoing/status";
import { PacketType } from "../packets/types";
import { LengthDelimitedBufferReader } from "./base";

const PACKET_TYPE_OFFSET = 4;

interface PacketConstructor {
    new (data: Buffer): IPacket;
}
const packets: {[key: number]: PacketConstructor} = {
    [PacketType.Hello]: ServerHelloPacket,
    [PacketType.LoginResult]: LoginResultPacket,
    [PacketType.StandbyResult]: StandbyResultPacket,
    [PacketType.ServerStatus]: IncomingResultPacket,
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
            return new UnsupportedIncomingPacket(buf);
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

    async onPacketReceived(
        socket: IDeviceSocket,
        packet: IPacket,
    ) {
        switch (packet.type) {
            case PacketType.ServerStatus:
                await socket.send(new StatusPacket());
                break;
        }
    },

    async requestDisconnect(socket: IDeviceSocket) {
        await socket.send(new ByePacket());
    },
};
