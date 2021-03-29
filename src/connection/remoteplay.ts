import _debug from "debug";

import { RemotePlayCommand, RemotePlayOutgoingPacket } from "../remoteplay/packets";
import { IDeviceSocket } from "../socket/model";
import { IDeviceConnection } from "./model";

const debug = _debug("playactor:connection:remoteplay");

export class RemotePlayDeviceConnection implements IDeviceConnection {
    constructor(
        private socket: IDeviceSocket,
    ) {}

    public get isConnected(): boolean {
        return !this.socket.isConnected;
    }

    public async close() {
        return this.socket.close();
    }

    public async standby() {
        await this.socket.send(new RemotePlayOutgoingPacket(
            RemotePlayCommand.Standby,
        ));

        // wait until the socket closes
        for await (const pack of this.socket.receive()) {
            debug("received...", pack);
        }
    }
}
