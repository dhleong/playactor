import { EmptyOutgoingPacket } from "../base";
import { PacketType } from "../types";

export class OskStartPacket extends EmptyOutgoingPacket {
    public readonly type = PacketType.OskStart;
}
