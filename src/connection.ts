import { OnScreenKeyboard } from "./keyboard";
import { IDeviceSocket } from "./socket/model";
import { KeyPress, RemoteControlProc } from "./socket/proc/remote-control";
import { StandbyProc } from "./socket/proc/standby";
import { StartTitleProc } from "./socket/proc/start-title";

/**
 * Represents an active connection to a PlayStation device, providing a
 * convenient interface to various remote capabilities.
 */
export class DeviceConnection {
    constructor(
        private readonly socket: IDeviceSocket,
    ) {}

    public get isConnected() {
        return this.socket.isConnected;
    }

    /**
     * End the connection with the device
     */
    public close() {
        return this.socket.close();
    }

    /**
     * Attempt to control the on-screen keyboard for a text field on the
     * screen. If there is no such text field, this method will reject
     * with an error.
     */
    public async openKeyboard() {
        // FIXME TODO
        return new OnScreenKeyboard(this.socket);
    }

    /**
     * Send a sequence of keypress events
     */
    public async sendKeys(events: KeyPress[]) {
        await this.socket.execute(new RemoteControlProc(events));
    }

    /**
     * Put the device into standby mode
     */
    public async standby() {
        await this.socket.execute(new StandbyProc());
    }

    /**
     * Attempt to start an app or game by its "title ID"
     */
    public async startTitleId(titleId: string) {
        await this.socket.execute(new StartTitleProc(titleId));
    }
}
