import { IPacket } from "../model";

export abstract class IncomingPacket implements IPacket {
    abstract type: number;

    public toBuffer(): Buffer {
        throw new Error("Incoming packet doesn't support toBuffer");
    }
}
