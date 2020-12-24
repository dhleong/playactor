const intLength = 4;

export class PacketBuilder {
    private buffer: Buffer;
    private offset = 0;

    constructor(length: number) {
        this.buffer = Buffer.alloc(length + intLength, 0);
        this.writeInt(length);
    }

    public writeInt(value: number) {
        this.buffer.writeInt32LE(value, this.offset);
        this.offset += intLength;
        return this;
    }

    public build() {
        return this.buffer;
    }
}