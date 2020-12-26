import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class BootPacket extends OutgoingPacket {
    public readonly type = PacketType.Boot;
    public readonly totalLength = 24;

    constructor(
        public readonly titleId: string,
    ) {
        super();
    }

    public fillBuffer(builder: PacketBuilder): void {
        builder.writePadded(this.titleId, 16);
    }
}
