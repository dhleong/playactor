import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class ClientHelloPacket extends OutgoingPacket {
    public readonly type = PacketType.Hello;
    public readonly totalLength = 28;

    constructor(
        private readonly protocolVersion: number,
    ) {
        super();
    }

    public fillBuffer(builder: PacketBuilder) {
        builder.writeInt(this.protocolVersion);

        // NOTE: 16 bytes of "seed id"; just using 0 seems fine
    }
}
