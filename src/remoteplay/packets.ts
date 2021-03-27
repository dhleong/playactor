import { IPacket } from "../socket/model";

export enum RemotePlayCommand {
    STANDBY = 0x50,
    LOGIN = 0x05,
}

export class RemotePlayIncomingPacket implements IPacket {
    constructor(
        public readonly type: number,
        private readonly buffer: Buffer,
    ) {}

    public toBuffer(): Buffer {
        return this.buffer;
    }
}

export class RemotePlayOutgoingPacket implements IPacket {
    constructor(
        public readonly type: number,
        private readonly payload?: Buffer,
    ) {}

    public toBuffer(): Buffer {
        const prelude = Buffer.alloc(8 + (this.payload?.length ?? 0));
        prelude.writeInt32LE(this.payload?.length ?? 0);
        prelude.writeInt16LE(this.type, 4);
        prelude.writeInt16LE(0, 6);

        return this.payload
            ? Buffer.concat([prelude, this.payload])
            : prelude;
    }
}
