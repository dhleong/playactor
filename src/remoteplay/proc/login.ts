import { IConnectionConfig } from "../../device/model";
import { performRpc, RpcError } from "../../socket/helpers";
import { IDeviceProc, IDeviceSocket } from "../../socket/model";
import { LoginResultError } from "../../socket/packets/incoming/login-result";
import { RemotePlayCommand, RemotePlayOutgoingPacket, RemotePlayResponseType } from "../packets";
import { RemotePlayLoginResultPacket } from "../packets/login-result";
import { RemotePlayPasscodeRequestPacket } from "../packets/passcode-request";

type Result = RemotePlayLoginResultPacket | RemotePlayPasscodeRequestPacket;

export class RemotePlayLoginProc implements IDeviceProc {
    constructor(
        public config: IConnectionConfig,
    ) {}

    public async perform(socket: IDeviceSocket) {
        const response = await performRpc<Result>(
            socket,
            new RemotePlayOutgoingPacket(RemotePlayCommand.LOGIN),
            RemotePlayResponseType.LOGIN,
        );

        if (response.type === RemotePlayResponseType.PASSCODE) {
            if (!this.config.login?.passCode) {
                throw new RpcError(
                    1,
                    LoginResultError.PASSCODE_IS_NEEDED,
                );
            }

            // TODO send passcode
        }
    }
}
