import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class StatusPacket extends OutgoingPacket {
    public readonly type = PacketType.Status;
    public readonly totalLength = 12;

    constructor(
        private readonly status: number = 0,
    ) {
        super();
    }

    public fillBuffer(builder: PacketBuilder) {
        builder.writeInt(this.status);
    }
}
