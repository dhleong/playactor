import { EmptyOutgoingPacket } from "../base";
import { PacketType } from "../types";

export class ByePacket extends EmptyOutgoingPacket {
    public readonly type = PacketType.Bye;
}
