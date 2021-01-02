import { IncomingPacket } from "../base";

export class UnsupportedIncomingPacket extends IncomingPacket {
    public type: number;

    constructor(
        data: Buffer,
    ) {
        super();
        this.type = data.readInt32LE(4);
    }
}
