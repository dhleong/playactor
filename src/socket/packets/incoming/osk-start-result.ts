import { IncomingResultPacket } from "../base";
import { PacketType } from "../types";

export class OskStartResultPacket extends IncomingResultPacket {
    public type = PacketType.OskStartResult;

    public readonly oskType: number;
    public readonly maxLength: number;
    public readonly initialContent: string;

    constructor(data: Buffer) {
        super(data);

        this.oskType = data.readInt32LE(12);

        let lengthPosition = 16;
        let stringPosition = 20;
        if (data.length > 36) {
            // TODO: for some reason, the way we decode it gives an extra
            // 16 bytes of garbage here. We should really figure out why
            // that's happening ... and fix it
            lengthPosition += 16;
            stringPosition += 16;
        }

        this.maxLength = data.readInt32LE(lengthPosition);
        this.initialContent = data.toString("UTF-16LE", stringPosition);
    }
}
