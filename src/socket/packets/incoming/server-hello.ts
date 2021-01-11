import { IncomingPacket, IResultPacket } from "../base";
import { resultToErrorCode } from "../errors";
import { PacketType } from "../types";

export class ServerHelloPacket extends IncomingPacket implements IResultPacket {
    public type = PacketType.Hello;

    public readonly version: number;
    public readonly result: number;
    public readonly option: number;
    public readonly seed: Buffer;

    public errorCode?: string;

    constructor(data: Buffer) {
        super();

        this.version = data.readInt32LE(8);
        this.result = data.readInt32LE(12);
        this.option = data.readInt32LE(16);
        this.seed = data.slice(20, 36);

        this.errorCode = resultToErrorCode(this.result);
    }
}
