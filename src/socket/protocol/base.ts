import _debug from "debug";

import { PacketReadState } from "../model";

const DEFAULT_MIN_PACKET_LENGTH = 4;

const debug = _debug("playactor:socket:length");

export class LengthDelimitedBufferReader {
    private currentBuffer?: Buffer;
    private actualLength?: number;
    private expectedLength?: number;

    constructor(
        private readonly minPacketLength: number = DEFAULT_MIN_PACKET_LENGTH,
    ) {}

    public read(data: Buffer, paddingSize?: number): PacketReadState {
        if (this.currentBuffer) {
            this.currentBuffer = Buffer.concat([this.currentBuffer, data]);
        } else {
            this.currentBuffer = data;
        }

        if (this.currentBuffer.length < this.minPacketLength) {
            return PacketReadState.PENDING;
        }

        if (this.expectedLength === undefined) {
            this.actualLength = this.currentBuffer.readInt32LE(0);
            this.expectedLength = paddingSize
                ? Math.ceil(this.actualLength / paddingSize) * paddingSize
                : this.actualLength;
            debug(
                "determined next packet length: ",
                this.expectedLength,
                `(actual: ${this.actualLength}; padding: ${paddingSize})`,
            );
        }

        if (this.currentBuffer.length >= this.expectedLength) {
            debug("have", this.currentBuffer.length, "of expected", this.expectedLength);
            return PacketReadState.DONE;
        }

        return PacketReadState.PENDING;
    }

    public get(): Buffer {
        const buffer = this.currentBuffer;
        if (!buffer) throw new Error("Invalid state: no buffer read");
        return buffer.slice(0, this.actualLength);
    }

    public remainder(): Buffer | undefined {
        const data = this.currentBuffer;
        if (!data) throw new Error("Illegal state: no buffer read");

        const expected = this.expectedLength;
        if (expected && expected < data.byteLength) {
            return data.slice(expected);
        }
    }
}
