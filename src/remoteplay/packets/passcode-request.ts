import { IncomingPacket, IResultPacket } from "../../socket/packets/base";
import { RemotePlayResponseType } from "../packets";

/**
 * Sent by the server in response to a LOGIN request when the account
 * is protected by a passcode
 */
export class RemotePlayPasscodeRequestPacket
    extends IncomingPacket
    implements IResultPacket {
    public readonly type: number = RemotePlayResponseType.Passcode;
    public result = 0;
}
