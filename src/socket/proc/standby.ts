import { performRpc } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { StandbyPacket } from "../packets/outgoing/standby";
import { PacketType } from "../packets/types";

export class StandbyProc implements IDeviceProc {
    public async perform(socket: IDeviceSocket) {
        await performRpc(
            socket,
            new StandbyPacket(),
            PacketType.StandbyResult,
        );
    }
}
