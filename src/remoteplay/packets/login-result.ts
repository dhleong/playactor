import { IncomingPacket, IResultPacket } from "../../socket/packets/base";
import { LoginResultError } from "../../socket/packets/incoming/login-result";

const toErrorCode: {[result: number]: string} = {
    1: LoginResultError.PASSCODE_IS_UNMATCHED,
};

export class RemotePlayLoginResultPacket
    extends IncomingPacket
    implements IResultPacket {
    public readonly type: number;
    public readonly result: number;
    public readonly errorCode?: string | undefined;

    constructor(data: Buffer) {
        super();

        this.type = data.readInt16BE(4);
        this.result = data.readUInt8(8);

        if (this.result !== 0) {
            this.errorCode = toErrorCode[this.result] ?? "UNKNOWN_ERROR";
        }
    }
}
