import { ICredentials } from "../../credentials/model";
import { receiveType } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { LoginResultPacket } from "../packets/incoming/login-result";
import { ILoginConfig, LoginPacket } from "../packets/outgoing/login";
import { StatusPacket } from "../packets/outgoing/status";
import { PacketType } from "../packets/types";

export class LoginError extends Error {
    constructor(
        public readonly code: string,
    ) {
        super(`Login error: ${code}`);
    }
}

export class LoginProc implements IDeviceProc {
    constructor(
        private readonly credentials: ICredentials,
        private readonly config: Partial<ILoginConfig> = {},
    ) {}

    public async perform(socket: IDeviceSocket) {
        await socket.send(new LoginPacket(
            socket.protocolVersion,
            this.credentials["user-credential"],
            this.config,
        ));

        const result = await receiveType<LoginResultPacket>(
            socket,
            PacketType.LoginResult,
        );

        if (result.errorCode) {
            throw new LoginError(result.errorCode);
        }

        await socket.send(new StatusPacket());
    }
}
