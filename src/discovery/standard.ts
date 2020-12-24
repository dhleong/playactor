import { DiscoveryVersions } from "../protocol";

import { CompositeDiscoveryNetwork } from "./composite";
import {
    IDiscoveryNetwork,
    IDiscoveryNetworkFactory,
    INetworkConfig,
    OnDeviceDiscoveredHandler,
} from "./model";
import { UdpDiscoveryNetworkFactory } from "./udp";

const standardFactories = [
    new UdpDiscoveryNetworkFactory(987, DiscoveryVersions.PS4),
    new UdpDiscoveryNetworkFactory(9302, DiscoveryVersions.PS5),
];

export const StandardDiscoveryNetworkFactory: IDiscoveryNetworkFactory = {
    create(
        config: INetworkConfig,
        onDevice: OnDeviceDiscoveredHandler,
    ): IDiscoveryNetwork {
        return new CompositeDiscoveryNetwork(
            standardFactories.map(factory => factory.create(config, onDevice)),
        );
    },
};
