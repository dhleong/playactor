import _debug from "debug";

import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { DeviceStatus, IDiscoveredDevice } from "../discovery/model";
import { RemotePlayCommand, RemotePlaySession } from "../remoteplay/session";
import { Waker } from "../waker";
import { IDeviceConnection } from "./model";

const debug = _debug("playactor:connection:remoteplay");

export class RemotePlayDeviceConnection implements IDeviceConnection {
    private isClosed = false;

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
        return !this.isClosed;
    }

    public async close() {
        this.isClosed = true;
    }

    public async standby() {
        const { status } = await this.resolveDevice();
        if (status === DeviceStatus.STANDBY) {
            // nop
            debug("device already in standby");
            return;
        }

        await this.withSession(s => s.sendCommand(RemotePlayCommand.STANDBY));
    }

    private async withSession<T>(
        block: (session: RemotePlaySession) => Promise<T>,
    ): Promise<T> {
        // TODO: we may need to restart the session if the device
        // has gone to sleep in the meantime, for example
        return block(this.session);
    }
}
