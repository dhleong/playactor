import _debug from "debug";

import { delayMillis } from "../../util/async";
import { IDeviceProc, IDeviceSocket } from "../model";
import { RemoteControlPacket } from "../packets/outgoing/remote-control";
import { InternalRemoteOperation, RemoteOperation } from "../remote";

const POST_CONNECT_SENDKEY_DELAY = 1500;

/** min delay between sendKey sends */
const MIN_SENDKEY_DELAY = 200;

export interface KeyPress {
    key: RemoteOperation;
    holdTimeMillis?: number;
}

const debug = _debug("playground:socket:RemoteControlProc");

function sendKey(
    socket: IDeviceSocket,
    key: RemoteOperation | InternalRemoteOperation,
    holdTimeMillis = 0,
) {
    return socket.send(new RemoteControlPacket(
        key,
        holdTimeMillis,
    ));
}

export class RemoteControlProc implements IDeviceProc {
    constructor(
        private readonly events: KeyPress[],
    ) {}

    public async perform(socket: IDeviceSocket) {
        const msSinceConnect = Date.now() - socket.openedTimestamp;
        const delay = POST_CONNECT_SENDKEY_DELAY - msSinceConnect;
        if (delay > 0) {
            // give it some time to think---if we try to OpenRc too soon
            // after connecting, the ps4 seems to disregard
            debug("socket just opened; wait before remote control");
            await delayMillis(delay);
        }

        await sendKey(socket, InternalRemoteOperation.OpenRC);
        await delayMillis(MIN_SENDKEY_DELAY);

        await this.sendKeys(socket);

        await sendKey(socket, InternalRemoteOperation.CloseRC);
        await delayMillis(MIN_SENDKEY_DELAY);
    }

    private async sendKeys(socket: IDeviceSocket) {
        // near as I can tell, here's how this works:
        // - For a simple tap, you send the key with holdTime=0,
        //   followed by KEY_OFF and holdTime = 0
        // - For a long press/hold, you still send the key with
        //   holdTime=0, then follow it with the key again, but
        //   specifying holdTime as the hold duration.
        // - After sending a direction, you should send KEY_OFF
        //   to clean it up (since it can just be held forever).
        //   Doing this after a long-press of PS just breaks it,
        //   however.

        for (const event of this.events) {
            /* eslint-disable no-await-in-loop */
            debug("sending:", event);
            await sendKey(socket, event.key);

            if (event.holdTimeMillis) {
                await delayMillis(event.holdTimeMillis);
                await sendKey(socket, event.key, event.holdTimeMillis);
            }

            // clean up the keypress. As mentioned above, after holding a
            // direction, sending KEY_OFF seems to make further presses
            // more reliable; doing that after holding PS button breaks
            // it, however.
            if (!event.holdTimeMillis || event.key !== RemoteOperation.PS) {
                await sendKey(socket, InternalRemoteOperation.KeyOff);
            }

            await delayMillis(
                event.key === RemoteOperation.PS
                    ? 1000 // higher delay after PS button press
                    : MIN_SENDKEY_DELAY, // too much lower and it becomes unreliable
            );
        }
    }
}
