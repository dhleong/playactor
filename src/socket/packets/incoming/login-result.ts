import { IncomingResultPacket } from "../base";
import { PacketType } from "../types";

export enum LoginResultError {
    /**
     * The device playactor is running on has not yet been registered
     * with the PlayStation; a pin code displayed on the PlayStation
     * needs to be input as part of the LoginProc to complete
     * registration.
     */
    PIN_IS_NEEDED = "PIN_IS_NEEDED",

    PASSCODE_IS_NEEDED = "PASSCODE_IS_NEEDED",
    PASSCODE_IS_UNMATCHED = "PASSCODE_IS_UNMATCHED",

    LOGIN_MGR_BUSY = "LOGIN_MGR_BUSY",
}

const resultToErrorCode: {[result: number]: string} = {
    20: LoginResultError.PIN_IS_NEEDED,
    22: LoginResultError.PASSCODE_IS_NEEDED,
    24: LoginResultError.PASSCODE_IS_UNMATCHED,
    30: LoginResultError.LOGIN_MGR_BUSY,
};

export class LoginResultPacket extends IncomingResultPacket {
    public type = PacketType.LoginResult;

    constructor(data: Buffer) {
        super(data, resultToErrorCode);
    }
}
