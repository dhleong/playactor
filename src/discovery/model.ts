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
    STANDBY = "STANDBY",
    AWAKE = "AWAKE",
}

export interface IDeviceAddress {
    address: string;
    port: number;
    family: "IPv4" | "IPv6";
}

export type DiscoveryKey =
    "host-id"
    | "host-type"
    | "host-request-port"
    | "host-name"
    | "system-version"
    | "device-discovery-protocol-version";

export enum DiscoveryMessageType {
    SRCH = "SRCH",
    WAKEUP = "WAKEUP",
    DEVICE = "DEVICE",
}

export interface IDiscoveryMessage {
    type: DiscoveryMessageType;
    sender: IDeviceAddress;
    version: DiscoveryVersion;
    data: Record<DiscoveryKey | string, string>;
}

export interface IDiscoveredDevice {
    address: IDeviceAddress;

    discoveryVersion: DiscoveryVersion;
    systemVersion: string;
    id: string;
    name: string;
    status: DeviceStatus;
}

export type OnDeviceDiscoveredHandler = (device: IDiscoveredDevice) => void;
export type OnDiscoveryMessageHandler = (message: IDiscoveryMessage) => void;

export interface IDiscoveryNetwork {
    close(): void;

    /** Request devices on the network to identify themselves */
    ping(): Promise<void>;

    send(
        recipientAddress: string,
        recipientPort: number,
        type: string,
        data?: Record<DiscoveryKey | string, unknown>,
    ): Promise<void>;
}

export interface IDiscoveryNetworkFactory {
    createMessages(
        config: INetworkConfig,
        onMessage: OnDiscoveryMessageHandler,
    ): IDiscoveryNetwork;

    createDevices(
        config: INetworkConfig,
        onDevice: OnDeviceDiscoveredHandler,
    ): IDiscoveryNetwork;
}
