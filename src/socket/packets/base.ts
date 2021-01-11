import { IPacket } from "../model";
import { PacketBuilder } from "./builder";
import { resultsToErrorCodes } from "./errors";

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

export interface IResultPacket extends IPacket {
    result: number;
    errorCode?: string;
}

export class IncomingResultPacket
    extends IncomingPacket
    implements IResultPacket {
    public readonly type: number;
    public readonly result: number;

    public readonly errorCode?: string;

    constructor(
        private readonly data: Buffer,
        toErrorCode: {[result: number]: string} = resultsToErrorCodes,
    ) {
        super();

        this.type = data.readInt32LE(4);
        this.result = data.readInt32LE(8);
        if (this.result !== 0) {
            this.errorCode = toErrorCode[this.result] ?? "UNKNOWN_ERROR";
        }
    }

    public toBuffer() {
        return this.data;
    }
}

export abstract class EmptyOutgoingPacket extends OutgoingPacket {
    public readonly totalLength = 8;

    public fillBuffer() {
        // nop
    }
}
