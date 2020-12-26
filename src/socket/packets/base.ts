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

export abstract class IncomingResultPacket extends IncomingPacket {
    public readonly result: number;

    public readonly errorCode?: string;

    constructor(
        data: Buffer,
        resultToErrorCode: {[result: number]: string} = {},
    ) {
        super();

        this.result = data.readInt32LE(8);
        if (this.result !== 0) {
            this.errorCode = resultToErrorCode[this.result] ?? "UNKNOWN";
        }
    }
}

export abstract class EmptyOutgoingPacket extends OutgoingPacket {
    public readonly totalLength = 8;

    public fillBuffer() {
        // nop
    }
}
