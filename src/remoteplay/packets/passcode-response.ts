import { RemotePlayCommand, RemotePlayOutgoingPacket } from "../packets";

export class RemotePlayPasscodeResponsePacket extends RemotePlayOutgoingPacket {
    constructor(passCode: string) {
        super(
            RemotePlayCommand.ProvidePasscode,
            Buffer.from(passCode),
        );
    }
}
