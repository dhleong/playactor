import _debug from "debug";

import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { DeviceStatus, IDiscoveredDevice } from "../discovery/model";
import { RemotePlayCommand } from "../remoteplay/packets";
import { RemotePlaySession } from "../remoteplay/session";
import { Waker } from "../waker";
import { IDeviceConnection } from "./model";

const debug = _debug("playactor:connection:remoteplay");

export class RemotePlayDeviceConnection implements IDeviceConnection {
    constructor(
        // FIXME most of these are only public to avoid typescript whining
        public readonly waker: Waker,
        public readonly device: IDiscoveredDevice,
        private readonly resolveDevice: () => Promise<IDiscoveredDevice>,
        public readonly config: IConnectionConfig,
        public readonly creds: IRemotePlayCredentials,
        private session: RemotePlaySession,
    ) {}

    public get isConnected(): boolean {
        return !this.session.isConnected;
    }

    public async close() {
        return this.session.close();
    }

    public async standby() {
        const { status } = await this.resolveDevice();
        if (status === DeviceStatus.STANDBY) {
            // nop
            debug("device already in standby");
            return;
        }

        await this.session.sendCommand(RemotePlayCommand.Standby);
    }
}
