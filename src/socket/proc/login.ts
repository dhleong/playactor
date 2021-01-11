import { ICredentials } from "../../credentials/model";
import { performRpc } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { LoginResultPacket } from "../packets/incoming/login-result";
import { ILoginConfig, LoginPacket } from "../packets/outgoing/login";
import { StatusPacket } from "../packets/outgoing/status";
import { PacketType } from "../packets/types";

export class LoginProc implements IDeviceProc {
    constructor(
        private readonly credentials: ICredentials,
        private readonly config: Partial<ILoginConfig> = {},
    ) {}

    public async perform(socket: IDeviceSocket) {
        await performRpc<LoginResultPacket>(
            socket,
            new LoginPacket(
                this.credentials["user-credential"],
                this.config,
            ),
            PacketType.LoginResult,
        );

        // eagerly send our "status"
        await socket.send(new StatusPacket());
    }
}
