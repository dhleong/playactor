import { OnScreenKeyboard } from "../../keyboard";
import { performRpc } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { OskStartResultPacket } from "../packets/incoming/osk-start-result";
import { OskStartPacket } from "../packets/outgoing/osk-start";
import { PacketType } from "../packets/types";

export class OpenKeyboardProc implements IDeviceProc<OnScreenKeyboard> {
    public async perform(socket: IDeviceSocket) {
        const result = await performRpc<OskStartResultPacket>(
            socket,
            new OskStartPacket(),
            PacketType.OskStartResult,
        );

        return new OnScreenKeyboard(
            socket,
            result.maxLength,
            result.initialContent,
        );
    }
}
