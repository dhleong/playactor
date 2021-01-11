import { IProtocolVersion } from "../../model";
import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class ClientHelloPacket extends OutgoingPacket {
    public readonly type = PacketType.Hello;
    public readonly totalLength = 28;

    constructor(
        private readonly protocolVersion: IProtocolVersion,
    ) {
        super();
    }

    public fillBuffer(builder: PacketBuilder) {
        builder
            .writeShort(this.protocolVersion.minor)
            .writeShort(this.protocolVersion.major);

        // NOTE: 16 bytes of "seed id"; just using 0 seems fine
    }
}
