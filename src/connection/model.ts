import { OnScreenKeyboard } from "../keyboard";
import { KeyPress } from "../socket/proc/remote-control";

export class UnsupportedDeviceError extends Error {
    constructor() {
        super("Device doesn't support connection");
    }
}

/**
 * Represents an active connection to a PlayStation device, providing a
 * convenient interface to various remote capabilities.
 */
export interface IDeviceConnection {
    isConnected: boolean;

    /**
     * End the connection with the device
     */
    close(): Promise<void>;

    /**
     * Attempt to control the on-screen keyboard for a text field on the
     * screen. If there is no such text field, this method will reject
     * with an error.
     */
    openKeyboard?(): Promise<OnScreenKeyboard>;

    /**
     * Send a sequence of keypress events
     */
    sendKeys?(events: KeyPress[]): Promise<void>;

    /**
     * Put the device into standby mode
     */
    standby(): Promise<void>;

    /**
     * Attempt to start an app or game by its "title ID"
     */
    startTitleId?(titleId: string, config?: {
        autoQuitExisting?: boolean,
    }): Promise<void>;
}
