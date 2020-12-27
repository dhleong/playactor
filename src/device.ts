import { PendingDevice } from "./device/pending";
import { IDiscoveryConfig, INetworkConfig } from "./discovery/model";

export type Config = INetworkConfig & Partial<IDiscoveryConfig>;

/**
 * IDevice factories
 */
export const Device = {
    /**
     * Return a Device that talks to the first one found on the network
     */
    any(config: Config = {}) {
        return new PendingDevice(
            "any",
            () => true,
            config,
            config,
        );
    },

    /**
     * Create a Device that talks to the device with the given address
     */
    withAddress(
        address: string,
        config: Config = {},
    ) {
        return new PendingDevice(
            `with address ${address}`,
            device => device.address === address,
            config,
            config,
        );
    },

    /**
     * Create a Device that talks to the first device on the network
     * with the given ID
     */
    withId(
        id: string,
        config: Config = {},
    ) {
        return new PendingDevice(
            `with id ${id}`,
            device => device.id === id,
            config,
            config,
        );
    },
};
