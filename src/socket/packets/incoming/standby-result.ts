import { IncomingResultPacket } from "../base";
import { PacketType } from "../types";

export class StandbyResultPacket extends IncomingResultPacket {
    public type = PacketType.StandbyResult;
}
