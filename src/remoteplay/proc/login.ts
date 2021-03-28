import { IConnectionConfig } from "../../device/model";
import { performRpc } from "../../socket/helpers";
import { IDeviceProc, IDeviceSocket } from "../../socket/model";
import { RemotePlayCommand, RemotePlayOutgoingPacket, RemotePlayResponseType } from "../packets";
import { RemotePlayLoginResultPacket } from "../packets/login-result";

export class RemotePlayLoginProc implements IDeviceProc {
    constructor(
        public config: IConnectionConfig,
    ) {}

    public async perform(socket: IDeviceSocket) {
        // TODO send passcode, if provided
        await performRpc<RemotePlayLoginResultPacket>(
            socket,
            new RemotePlayOutgoingPacket(RemotePlayCommand.LOGIN),
            RemotePlayResponseType.LOGIN,
        );
    }
}
