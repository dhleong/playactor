import { IncomingPacket } from "../base";
import { PacketType } from "../types";

const resultToErrorCode: {[result: number]: string} = {
    20: "PIN_IS_NEEDED",
    22: "PASSCODE_IS_NEEDED",
    24: "PASSCODE_IS_UNMATCHED",
    30: "LOGIN_MGR_BUSY",
};

export class LoginResultPacket extends IncomingPacket {
    public type = PacketType.LoginResult;

    public readonly result: number;

    public readonly errorCode?: string;

    constructor(data: Buffer) {
        super();

        this.result = data.readInt32LE(8);
        if (this.result !== 0) {
            this.errorCode = resultToErrorCode[this.result] ?? "UNKNOWN";
        }
    }
}
