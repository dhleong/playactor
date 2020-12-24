import { DiscoveryVersion } from "../protocol";

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

export enum DeviceStatus {
    STANDBY,
    AWAKE,
}

export interface IDiscoveredDevice {
    address: string;
    port: number;

    discoveryVersion: DiscoveryVersion;
    id: string;
    status: DeviceStatus;
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
