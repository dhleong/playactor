import { EmptyOutgoingPacket } from "../base";
import { PacketType } from "../types";

export class StandbyPacket extends EmptyOutgoingPacket {
    public readonly type = PacketType.Standby;
}
