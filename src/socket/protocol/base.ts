import _debug from "debug";

import {
    IBufferReader, IPacket, IPacketReader, PacketReadState,
} from "../model";

const DEFAULT_MIN_PACKET_LENGTH = 4;

const debug = _debug("playactor:socket:base");

export interface IOptions {
    minPacketLength?: number;
    lengthIncludesHeader?: boolean;
    littleEndian?: boolean;
}

export class LengthDelimitedBufferReader implements IBufferReader {
    private readonly minPacketLength: number;
    private readonly lengthIncludesHeader: boolean;
    private readonly littleEndian: boolean;

    private currentBuffer?: Buffer;
    private actualLength?: number;
    private expectedLength?: number;

    constructor({
        minPacketLength = DEFAULT_MIN_PACKET_LENGTH,
        lengthIncludesHeader = true,
        littleEndian = true,
    }: IOptions = {}) {
        this.minPacketLength = minPacketLength;
        this.lengthIncludesHeader = lengthIncludesHeader;
        this.littleEndian = littleEndian;
    }

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
            this.actualLength = this.littleEndian
                ? this.currentBuffer.readInt32LE(0)
                : this.currentBuffer.readInt32BE(0);
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
        return buffer.slice(0, this.currentPacketLength);
    }

    public remainder(): Buffer | undefined {
        const data = this.currentBuffer;
        if (!data) throw new Error("Illegal state: no buffer read");

        const expected = this.currentPacketExpectedLength;
        if (expected && expected < data.byteLength) {
            return data.slice(expected);
        }
    }

    private get currentPacketLength() {
        if (!this.actualLength) return;
        return this.lengthIncludesHeader
            ? this.actualLength
            : this.actualLength + this.minPacketLength;
    }

    private get currentPacketExpectedLength() {
        if (!this.expectedLength) return;
        return this.lengthIncludesHeader
            ? this.expectedLength
            : this.expectedLength + this.minPacketLength;
    }
}

export interface PacketConstructor {
    new (data: Buffer): IPacket;
}

/**
 * The [TypedPacketReader] delegates most of its functionality to an
 * [IBufferReader] (by default, [LengthDelimitedBufferReader]) and
 * creates packets given a map of type to constructor
 */
export abstract class TypedPacketReader implements IPacketReader {
    constructor(
        private readonly packets: { [key: number]: PacketConstructor },
        private readonly base: IBufferReader = new LengthDelimitedBufferReader(),
    ) {}

    protected abstract readType(buffer: Buffer): number;
    protected abstract createDefaultPacket(type: number, buffer: Buffer): IPacket;

    public read(data: Buffer, paddingSize?: number): PacketReadState {
        return this.base.read(data, paddingSize);
    }

    public get(): IPacket {
        const buf = this.base.get();
        const type = this.readType(buf);
        const Constructor = this.packets[type];
        if (!Constructor) {
            debug(`received unsupported packet[${type}]: `, buf);
            return this.createDefaultPacket(type, buf);
        }
        return new Constructor(buf);
    }

    public remainder(): Buffer | undefined {
        return this.base.remainder();
    }
}
