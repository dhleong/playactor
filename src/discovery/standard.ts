import dgram from "dgram";

import { wakePortsByType } from "../waker/udp";

import { CompositeDiscoveryNetwork } from "./composite";
import {
    DeviceType,
    DiscoveryVersions,
    IDiscoveryNetwork,
    IDiscoveryNetworkFactory,
    INetworkConfig,
    OnDeviceDiscoveredHandler,
    OnDiscoveryMessageHandler,
} from "./model";
import { UdpDiscoveryNetworkFactory } from "./udp";

const standardFactories = [
    new UdpDiscoveryNetworkFactory(
        wakePortsByType[DeviceType.PS4],
        DiscoveryVersions.PS4,
    ),
    new UdpDiscoveryNetworkFactory(
        wakePortsByType[DeviceType.PS5],
        DiscoveryVersions.PS5,
    ),
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

    createRawMessages(
        config: INetworkConfig,
        onMessage: (buffer: Buffer, rinfo: dgram.RemoteInfo) => void,
    ): IDiscoveryNetwork {
        return new CompositeDiscoveryNetwork(
            standardFactories.map(factory => factory.createRawMessages(config, onMessage)),
        );
    },
};
