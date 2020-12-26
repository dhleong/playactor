import { performRpc } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { BootPacket } from "../packets/outgoing/boot";
import { PacketType } from "../packets/types";

export class StartTitleProc implements IDeviceProc {
    constructor(
        private readonly titleId: string,
    ) {}

    public async perform(socket: IDeviceSocket) {
        await performRpc(
            socket,
            new BootPacket(this.titleId),
            PacketType.BootResult,
        );
    }
}
