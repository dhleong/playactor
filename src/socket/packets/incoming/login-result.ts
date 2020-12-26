import { IncomingResultPacket } from "../base";
import { PacketType } from "../types";

const resultToErrorCode: {[result: number]: string} = {
    20: "PIN_IS_NEEDED",
    22: "PASSCODE_IS_NEEDED",
    24: "PASSCODE_IS_UNMATCHED",
    30: "LOGIN_MGR_BUSY",
};

export class LoginResultPacket extends IncomingResultPacket {
    public type = PacketType.LoginResult;

    constructor(data: Buffer) {
        super(data, resultToErrorCode);
    }
}
