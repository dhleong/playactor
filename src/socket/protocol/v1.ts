import {
    IDeviceProtocol,
    IDeviceSocket,
    IPacket,
    IPacketReader,
} from "../model";
import { IncomingResultPacket } from "../packets/base";
import { LoginResultPacket } from "../packets/incoming/login-result";
import { OskStartResultPacket } from "../packets/incoming/osk-start-result";
import { ServerHelloPacket } from "../packets/incoming/server-hello";
import { StandbyResultPacket } from "../packets/incoming/standby-result";
import { UnsupportedIncomingPacket } from "../packets/incoming/unsupported";
import { ByePacket } from "../packets/outgoing/bye";
import { StatusPacket } from "../packets/outgoing/status";
import { PacketType } from "../packets/types";
import { TypedPacketReader } from "./base";

const PACKET_TYPE_OFFSET = 4;

export class PacketReaderV1 extends TypedPacketReader {
    constructor() {
        super({
            [PacketType.Hello]: ServerHelloPacket,
            [PacketType.BootResult]: IncomingResultPacket,
            [PacketType.LoginResult]: LoginResultPacket,
            [PacketType.OskStartResult]: OskStartResultPacket,
            [PacketType.StandbyResult]: StandbyResultPacket,
            [PacketType.ServerStatus]: IncomingResultPacket,
        });
    }

    protected readType(buffer: Buffer): number {
        return buffer.readInt32LE(PACKET_TYPE_OFFSET);
    }

    protected createDefaultPacket(type: number, buffer: Buffer): IPacket {
        return new UnsupportedIncomingPacket(buffer);
    }
}

export const DeviceProtocolV1: IDeviceProtocol = {
    version: {
        major: 2,
        minor: 0,
    },

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
