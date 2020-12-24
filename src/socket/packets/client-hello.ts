import { IPacket } from "../model";
import { PacketBuilder } from "./builder";
import { PacketType } from "./types";

export class ClientHelloPacket implements IPacket {
    public readonly type = PacketType.Hello;

    constructor(
        private readonly protocolVersion: number,
    ) {}

    public toBuffer(): Buffer {
        return new PacketBuilder(24)
            .writeInt(this.type)
            .writeInt(this.protocolVersion)
            // NOTE: 16 bytes of "seed id"; just using 0 seems fine
            .build();
    }
}
