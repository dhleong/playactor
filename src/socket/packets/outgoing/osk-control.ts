import { OskCommand } from "../../osk";
import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class OskControlPacket extends OutgoingPacket {
    public readonly type = PacketType.OskControl;
    public readonly totalLength = 12;

    constructor(
        private readonly command: OskCommand,
    ) {
        super();
    }

    public fillBuffer(builder: PacketBuilder) {
        builder.writeInt(this.command);
    }
}
