import { CredentialManager } from "../credentials";
import { Discovery } from "../discovery";
import {
    IDiscoveredDevice,
    IDiscoveryConfig,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "../discovery/model";
import { StandardDiscoveryNetworkFactory } from "../discovery/standard";
import { ISocketConfig } from "../socket/model";
import { SimpleWakerFactory } from "../waker";
import { UdpWakerNetworkFactory } from "../waker/udp";
import { IDevice } from "./model";
import { ResolvedDevice } from "./resolved";

export class PendingDevice implements IDevice {
    private delegate?: IDevice;

    constructor(
        public readonly description: string,
        private readonly predicate: (device: IDiscoveredDevice) => boolean,
        private readonly networkConfig: INetworkConfig = {},
        private readonly discoveryConfig: Partial<IDiscoveryConfig> = {},
        private readonly discoveryFactory: IDiscoveryNetworkFactory =
        StandardDiscoveryNetworkFactory,
    ) {}

    public async discover(config?: INetworkConfig) {
        const delegate = await this.resolve(config);
        return delegate.discover(config);
    }

    public async wake() {
        const delegate = await this.resolve();
        return delegate.wake();
    }

    public async openConnection(
        socketConfig?: ISocketConfig,
    ) {
        const delegate = await this.resolve();
        return delegate.openConnection(socketConfig);
    }

    private async resolve(config?: INetworkConfig) {
        const existing = this.delegate;
        if (existing) return existing;

        const discovery = new Discovery(
            this.discoveryConfig,
            this.discoveryFactory,
        );
        for await (const device of discovery.discover(config ?? this.networkConfig)) {
            if (this.predicate(device)) {
                const newDelegate = new ResolvedDevice(
                    new SimpleWakerFactory({
                        credentials: new CredentialManager(),
                        discoveryConfig: this.discoveryConfig,
                        networkFactory: new UdpWakerNetworkFactory(),
                        discoveryFactory: StandardDiscoveryNetworkFactory,
                    }),
                    device,
                );
                this.delegate = newDelegate;
                return newDelegate;
            }
        }

        throw new Error(`Unable to locate device: ${this.description}`);
    }
}
