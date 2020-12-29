import { IDeviceSocket } from "./socket/model";
import {
    OskActionType, OskCommand, OskFlags, OskInputType,
} from "./socket/osk";
import { OskControlPacket } from "./socket/packets/outgoing/osk-control";

/**
 * Represents an active on-screen keyboard control session
 */
export class OnScreenKeyboard {
    private isValid = true;

    constructor(
        private readonly socket: IDeviceSocket,
        public readonly maxLength: number,
        public readonly initialContent: string,
        public readonly actionType: OskActionType = OskActionType.Default,
        public readonly inputType: OskInputType = OskInputType.Default,
        public readonly flags: OskFlags = OskFlags.None,
    ) {}

    public get isActive() {
        return this.isValid;
    }

    public hasFlag(flag: OskFlags) {
        // eslint-disable-next-line no-bitwise
        return (this.flags & flag) !== 0;
    }

    /**
     * Close the keyboard. This instance will become unusable, isActive
     * will return false, and all other method calls on this instance
     * will fail
     */
    public async close() {
        this.ensureValid();

        await this.socket.send(new OskControlPacket(OskCommand.Close));
        this.isValid = false;
    }

    /**
     * "Submit" the text currently in the keyboard, like pressing the
     * "return" key. This also has the effect of `close()`.
     */
    public async submit() {
        this.ensureValid();

        await this.socket.send(new OskControlPacket(OskCommand.Submit));
        this.isValid = false;
    }

    private ensureValid() {
        if (!this.isValid) {
            throw new Error("Performing actions on inactive Keyboard");
        }

        if (!this.socket.isConnected) {
            throw new Error("Perfroming OSK actions on disconnected socket");
        }
    }
}
