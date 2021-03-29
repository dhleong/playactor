import _debug from "debug";

import { DeviceStatus, IDiscoveredDevice } from "../discovery/model";
import { RemotePlayCommand, RemotePlayOutgoingPacket } from "../remoteplay/packets";
import { IDeviceSocket } from "../socket/model";
import { IDeviceConnection } from "./model";

const debug = _debug("playactor:connection:remoteplay");

export class RemotePlayDeviceConnection implements IDeviceConnection {
    constructor(
        private readonly resolveDevice: () => Promise<IDiscoveredDevice>,
        private socket: IDeviceSocket,
    ) {}

    public get isConnected(): boolean {
        return !this.socket.isConnected;
    }

    public async close() {
        return this.socket.close();
    }

    public async standby() {
        const { status } = await this.resolveDevice();
        if (status === DeviceStatus.STANDBY) {
            // nop
            debug("device already in standby");
            return;
        }

        await this.socket.send(new RemotePlayOutgoingPacket(
            RemotePlayCommand.Standby,
        ));
    }
}
