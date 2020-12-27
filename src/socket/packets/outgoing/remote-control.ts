import { InternalRemoteOperation, RemoteOperation } from "../../remote";
import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class RemoteControlPacket extends OutgoingPacket {
    public readonly type = PacketType.Status;
    public readonly totalLength = 16;

    constructor(
        private readonly op: RemoteOperation | InternalRemoteOperation,
        private readonly holdTimeMillis: number = 0,
    ) {
        super();
    }

    public fillBuffer(builder: PacketBuilder) {
        builder
            .writeInt(this.op)
            .writeInt(this.holdTimeMillis);
    }
}
