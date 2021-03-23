import { openConnection } from "../connection";
import { IDeviceConnection } from "../connection/model";
import { Discovery } from "../discovery";
import {
    IDiscoveredDevice, IDiscoveryConfig, IDiscoveryNetworkFactory, INetworkConfig,
} from "../discovery/model";
import { IWakerFactory } from "../waker";

import { DeviceCapability, IConnectionConfig, IResolvedDevice } from "./model";

export class ResolvedDevice implements IResolvedDevice {
    constructor(
        private readonly wakerFactory: IWakerFactory,
        private readonly description: IDiscoveredDevice,
        private readonly networkConfig: INetworkConfig,
        private readonly discoveryConfig: Partial<IDiscoveryConfig>,
        private readonly discoveryFactory: IDiscoveryNetworkFactory,
    ) {}

    public async discover() {
        return this.description;
    }

    public async wake() {
        await this.startWaker();
    }

    /**
     * discover() returns the original IDiscoveredDevice, but if
     * you need to get an updated description for any reason, this
     * method will do the job.
     */
    public async resolve(config?: INetworkConfig) {
        const discovery = new Discovery(
            this.discoveryConfig,
            this.discoveryFactory,
        );
        for await (const device of discovery.discover(config ?? this.networkConfig)) {
            if (device.id === this.description.id) {
                return device;
            }
        }
        throw new Error(`Could not resolve ${this.description.name}`);
    }

    public async openConnection(
        config: IConnectionConfig = {},
    ): Promise<IDeviceConnection> {
        const waker = await this.startWaker();
        const creds = await waker.credentials.getForDevice(
            this.description,
        );

        return openConnection(waker, this, this.description, config, creds);
    }

    public isSupported(capability: DeviceCapability): boolean {
        switch (capability) {
            case DeviceCapability.WAKE:
                // all devices support wake so far
                return true;

            default:
                return false;
        }
    }

    private async startWaker() {
        const waker = this.wakerFactory.create();
        await waker.wake(this.description);
        return waker;
    }
}
