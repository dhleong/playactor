import { PacketReadState } from "../model";

export class LengthDelimitedBufferReader {
    private currentBuffer?: Buffer;

    public read(data: Buffer): PacketReadState {
        if (this.currentBuffer) {
            this.currentBuffer = Buffer.concat([this.currentBuffer, data]);
        } else {
            this.currentBuffer = data;
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
        if (expected < data.byteLength) {
            return data.slice(expected);
        }
    }

    private get expectedLength() {
        const buffer = this.currentBuffer;
        if (!buffer) throw new Error("Unable to derive length without a buffer");

        return buffer.readInt32LE(0);
    }
}
