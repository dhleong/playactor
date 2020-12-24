import { IncomingPacket } from "./base";
import { PacketType } from "./types";

export class ServerHelloPacket extends IncomingPacket {
    public type = PacketType.Hello;

    public readonly version: number;
    public readonly result: number;
    public readonly option: number;
    public readonly seed: Buffer;

    constructor(data: Buffer) {
        super();

        this.version = data.readInt32LE(8);
        this.result = data.readInt32LE(12);
        this.option = data.readInt32LE(16);
        this.seed = data.slice(20, 36);
    }
}
