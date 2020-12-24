import { CredentialManager } from "./credentials";
import { Discovery } from "./discovery";
import {
    IDiscoveredDevice,
    IDiscoveryConfig,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "./discovery/model";
import { StandardDiscoveryNetworkFactory } from "./discovery/standard";
import { formatDiscoveryMessage } from "./protocol";
import { IWakerNetworkFactory } from "./waker/model";
import { UdpWakerNetworkFactory } from "./waker/udp";

export class Waker {
    constructor(
        private readonly credentials: CredentialManager,
        private readonly networkFactory: IWakerNetworkFactory =
        new UdpWakerNetworkFactory(),
        private readonly discoveryFactory: IDiscoveryNetworkFactory =
        StandardDiscoveryNetworkFactory,
    ) {}

    public async wake(
        device: IDiscoveredDevice,
        config: INetworkConfig = {},
    ) {
        const creds = await this.credentials.getForDevice(device);
        const network = this.networkFactory.create(config);

        const message = formatDiscoveryMessage({
            data: creds as any,
            type: "WAKEUP",
            version: device.discoveryVersion,
        });
        await network.sendTo(device, message);

        const discoveryConfig: Partial<IDiscoveryConfig> = {};
        const discovery = new Discovery(discoveryConfig, this.discoveryFactory);

        for await (const d of discovery.discover(config, discoveryConfig)) {
            // TODO
            if (d.id === device.id && d.status !== "Standby") {
                break;
            }
        }
    }
}
