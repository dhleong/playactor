import { IPacket } from "../model";
import { PacketBuilder } from "./builder";

export abstract class IncomingPacket implements IPacket {
    abstract type: number;

    public toBuffer(): Buffer {
        throw new Error("Incoming packet doesn't support toBuffer");
    }
}

export abstract class OutgoingPacket implements IPacket {
    abstract type: number;
    abstract totalLength: number;

    public abstract fillBuffer(builder: PacketBuilder): void;

    public toBuffer(): Buffer {
        const builder = new PacketBuilder(this.totalLength)
            .writeInt(this.type);
        this.fillBuffer(builder);
        return builder.build();
    }
}
