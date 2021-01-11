import _debug from "debug";

import { IPacketCodec, PacketReadState } from "../model";

const minPacketLength = 4;

const debug = _debug("playground:packets:length");

export class LengthDelimitedBufferReader {
    private currentBuffer?: Buffer;
    private expectedLength?: number;

    public read(codec: IPacketCodec, data: Buffer): PacketReadState {
        if (this.currentBuffer) {
            this.currentBuffer = Buffer.concat([this.currentBuffer, data]);
        } else {
            this.currentBuffer = data;
        }

        if (this.currentBuffer.length < minPacketLength) {
            return PacketReadState.PENDING;
        }

        if (this.expectedLength === undefined) {
            const available = codec.decode(this.currentBuffer);
            if (available.length < minPacketLength) {
                debug("decoded", this.currentBuffer, "into:", available);
                return PacketReadState.PENDING;
            }

            this.expectedLength = available.readInt32LE(0);
        }

        if (this.currentBuffer.length >= this.expectedLength) {
            return PacketReadState.DONE;
        }

        return PacketReadState.PENDING;
    }

    public get(): Buffer {
        const buffer = this.currentBuffer;
        if (!buffer) throw new Error("Invalid state: no buffer read");
        return buffer.slice(0, this.expectedLength);
    }

    public remainder(): Buffer | undefined {
        const data = this.currentBuffer;
        if (!data) throw new Error("Illegal state: no buffer read");

        const expected = this.expectedLength;
        if (expected === undefined) {
            throw new Error("Illegal state: no expected length");
        }

        if (expected < data.byteLength) {
            return data.slice(expected);
        }
    }
}
