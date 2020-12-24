import { IPacket } from "../model";
import { PacketBuilder } from "./builder";
import { PacketType } from "./types";

export class HandshakePacket implements IPacket {
    public type = PacketType.Handshake;

    constructor(
        private readonly key: Buffer,
        private readonly seed: Buffer,
    ) {
        if (key.length !== 256) {
            throw new Error(`Key is wrong size (was ${key.length})`);
        }
        if (seed.length > 16) {
            throw new Error(`Seed is wrong size (was ${seed.length})`);
        }
    }

    public toBuffer(): Buffer {
        return new PacketBuilder(276)
            .writeInt(this.type)
            .write(this.key)
            .write(this.seed)
            .build();
    }
}
