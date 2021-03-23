import _debug from "debug";

import { IDeviceConnection } from "./model";

import { IDiscoveredDevice } from "../discovery/model";
import { RpcError } from "../socket/helpers";
import { IDeviceSocket } from "../socket/model";
import { OpenKeyboardProc } from "../socket/proc/open-keyboard";
import { KeyPress, RemoteControlProc } from "../socket/proc/remote-control";
import { StandbyProc } from "../socket/proc/standby";
import { StartTitleProc } from "../socket/proc/start-title";
import { RemoteOperation } from "../socket/remote";

const RunningAppId = "running-app-titleid";
const RunningAppName = "running-app-name";

// NOTE: This code doesn't seem to match with our standard set
// (which would call this NO_SUCH_GAME) but does seem to be what
// the console is sending in this situation
const WillQuitExistingAppResult = 12;

const debug = _debug("playground:secondscreen:connection");

export class SecondScreenDeviceConnection implements IDeviceConnection {
    constructor(
        private readonly resolveDevice: () => Promise<IDiscoveredDevice>,
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
        return this.socket.execute(new OpenKeyboardProc());
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
    public async startTitleId(titleId: string, config: {
        autoQuitExisting?: boolean,
    } = {}) {
        const state = await this.resolveDevice();
        const runningApp = state.extras[RunningAppId];
        if (runningApp === titleId) {
            debug("title id", titleId, "already running");
            return;
        }

        const willAutoQuit = config.autoQuitExisting !== false;
        const willQuit = runningApp && willAutoQuit;

        if (willQuit) {
            // something else is running
            debug("another app (", state.extras[RunningAppName], ") is running; quitting that first");
            await this.sendKeys([{
                key: RemoteOperation.PS,
            }]);
        }

        try {
            await this.socket.execute(new StartTitleProc(titleId));
        } catch (e) {
            if (
                e instanceof RpcError
                && e.result === WillQuitExistingAppResult
            ) {
                debug("accepting prompt to quit existing app");
                await this.sendKeys([{
                    key: RemoteOperation.Enter,
                }]);
                return;
            }

            throw e;
        }
    }
}
