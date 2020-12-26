const intLength = 4;

export class PacketBuilder {
    private buffer: Buffer;
    private offset = 0;

    constructor(length: number) {
        this.buffer = Buffer.alloc(length, 0);
        this.writeInt(length);
    }

    public write(data: Buffer) {
        data.copy(this.buffer, this.offset);
        this.offset += data.byteLength;
        return this;
    }

    public writePadded(
        data: string,
        length?: number,
        encoding?: "utf8",
    ) {
        const toWrite = !length || data.length <= length
            ? data
            : data.substring(0, length);

        const written = encoding
            ? this.buffer.write(toWrite, this.offset, encoding)
            : this.buffer.write(toWrite, this.offset);
        this.offset += written;

        if (length) {
            // 1 byte at a time is inefficient, but simple
            const padding = length - written;
            for (let i = 0; i < padding; ++i) {
                this.buffer.writeUInt8(0, this.offset + i);
            }
            this.offset += padding;
        }

        return this;
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
