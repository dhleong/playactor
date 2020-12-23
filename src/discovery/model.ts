export interface IDiscoveryConfig {
    pingIntervalMillis: number;
    timeoutMillis: number;
}

export const defaultDiscoveryConfig: IDiscoveryConfig = {
    pingIntervalMillis: 5_000,
    timeoutMillis: 30_000,
};

export interface INetworkConfig {
    localBindAddress?: string;
    localBindPort?: number;
}

export interface IDiscoveredDevice {
    address: string;
}

export type OnDeviceDiscoveredHandler = (device: IDiscoveredDevice) => void;

export interface IDiscoveryNetwork {
    close(): void;

    /** Request devices on the network to identify themselves */
    ping(): Promise<void>;
}

export interface IDiscoveryNetworkFactory {
    create(
        config: INetworkConfig,
        onDevice: OnDeviceDiscoveredHandler,
    ): IDiscoveryNetwork;
}
