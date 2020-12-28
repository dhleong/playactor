import { DiscoveryVersions } from "../protocol";

import { CompositeDiscoveryNetwork } from "./composite";
import {
    IDiscoveryNetwork,
    IDiscoveryNetworkFactory,
    INetworkConfig,
    OnDeviceDiscoveredHandler,
    OnDiscoveryMessageHandler,
} from "./model";
import { UdpDiscoveryNetworkFactory } from "./udp";

const standardFactories = [
    new UdpDiscoveryNetworkFactory(987, DiscoveryVersions.PS4),
    new UdpDiscoveryNetworkFactory(9302, DiscoveryVersions.PS5),
];

export const StandardDiscoveryNetworkFactory: IDiscoveryNetworkFactory = {
    createDevices(
        config: INetworkConfig,
        onDevice: OnDeviceDiscoveredHandler,
    ): IDiscoveryNetwork {
        return new CompositeDiscoveryNetwork(
            standardFactories.map(factory => factory.createDevices(config, onDevice)),
        );
    },

    createMessages(
        config: INetworkConfig,
        onMessage: OnDiscoveryMessageHandler,
    ): IDiscoveryNetwork {
        return new CompositeDiscoveryNetwork(
            standardFactories.map(factory => factory.createMessages(config, onMessage)),
        );
    },
};
