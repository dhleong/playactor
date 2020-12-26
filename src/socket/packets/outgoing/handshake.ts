import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export class HandshakePacket extends OutgoingPacket {
    public type = PacketType.Handshake;
    public totalLength = 280;

    constructor(
        private readonly key: Buffer,
        private readonly seed: Buffer,
    ) {
        super();

        if (key.length !== 256) {
            throw new Error(`Key is wrong size (was ${key.length})`);
        }
        if (seed.length > 16) {
            throw new Error(`Seed is wrong size (was ${seed.length})`);
        }
    }

    public fillBuffer(builder: PacketBuilder) {
        builder
            .write(this.key)
            .write(this.seed);
    }
}
