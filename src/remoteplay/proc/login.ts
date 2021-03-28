import { IConnectionConfig } from "../../device/model";
import { performRpc } from "../../socket/helpers";
import { IDeviceProc, IDeviceSocket } from "../../socket/model";
import { RemotePlayCommand, RemotePlayOutgoingPacket, RemotePlayResponseType } from "../packets";

export class RemotePlayLoginProc implements IDeviceProc {
    constructor(
        public config: IConnectionConfig,
    ) {}

    public async perform(socket: IDeviceSocket) {
        // TODO send passcode, if provided
        // TODO check response packet
        await performRpc(
            socket,
            new RemotePlayOutgoingPacket(RemotePlayCommand.LOGIN),
            RemotePlayResponseType.LOGIN,
        );
    }
}
