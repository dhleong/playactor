import { IConnectionConfig } from "../../device/model";
import { performRpc, RpcError } from "../../socket/helpers";
import { IDeviceProc, IDeviceSocket } from "../../socket/model";
import { LoginResultError } from "../../socket/packets/incoming/login-result";
import { RemotePlayCommand, RemotePlayOutgoingPacket, RemotePlayResponseType } from "../packets";
import { RemotePlayLoginResultPacket } from "../packets/login-result";
import { RemotePlayPasscodeRequestPacket } from "../packets/passcode-request";
import { RemotePlayPasscodeResponsePacket } from "../packets/passcode-response";

type Result = RemotePlayLoginResultPacket | RemotePlayPasscodeRequestPacket;

export class RemotePlayLoginProc implements IDeviceProc {
    constructor(
        public config: IConnectionConfig,
    ) {}

    public async perform(socket: IDeviceSocket) {
        const response = await performRpc<Result>(
            socket,
            new RemotePlayOutgoingPacket(RemotePlayCommand.Login),
            RemotePlayResponseType.Login, RemotePlayResponseType.Passcode,
        );

        if (response.type === RemotePlayResponseType.Passcode) {
            const passCode = this.config.login?.passCode;
            if (!passCode || !passCode.length) {
                throw new RpcError(
                    1,
                    LoginResultError.PASSCODE_IS_NEEDED,
                );
            }

            // send the passcode
            await performRpc(
                socket,
                new RemotePlayPasscodeResponsePacket(passCode),
                RemotePlayResponseType.Login,
            );
        }
    }
}
