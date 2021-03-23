import { ICredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { DeviceStatus, IDiscoveredDevice } from "../discovery/model";
import { Waker } from "../waker";
import { IDeviceConnection } from "./model";

export class RemotePlayDeviceConnection implements IDeviceConnection {
    private isClosed = false;

    constructor(
        // FIXME most of these are only public to avoid typescript whining
        public readonly waker: Waker,
        public readonly device: IDiscoveredDevice,
        private readonly resolveDevice: () => Promise<IDiscoveredDevice>,
        public readonly config: IConnectionConfig,
        public readonly creds: ICredentials,
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

        }

        // TODO
    }
}
