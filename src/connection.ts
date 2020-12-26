import { IDeviceSocket } from "./socket/model";
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
