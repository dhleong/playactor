import dgram from "dgram";

export const DiscoveryVersions = {
    PS4: "00020020",
    PS5: "00030010",
} as const;

export type DiscoveryVersion = typeof DiscoveryVersions[keyof typeof DiscoveryVersions];

export interface IDiscoveryConfig {
    pingIntervalMillis: number;
    timeoutMillis: number;
    uniqueDevices: boolean;
}

export const defaultDiscoveryConfig: IDiscoveryConfig = {
    pingIntervalMillis: 5_000,
    timeoutMillis: 30_000,
    uniqueDevices: true,
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

const discoveryKeysArrray = [
    "host-id",
    "host-name",
    "host-request-port",
    "host-type",
    "system-version",
    "device-discovery-protocol-version",
] as const;

export type DiscoveryKey = typeof discoveryKeysArrray[number];

const discoveryKeys: Set<string> = new Set(discoveryKeysArrray);

export const outgoingDiscoveryKeys = new Set([
    ...discoveryKeysArrray,
    "app-type",
    "auth-type",
    "client-type",
    "model",
    "user-credential",
]);

export function isDiscoveryKey(s: string): s is DiscoveryKey {
    return discoveryKeys.has(s);
}

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

export enum DeviceType {
    PS4 = "PS4",
    PS5 = "PS5",
}

export interface IDiscoveredDevice {
    address: IDeviceAddress;
    hostRequestPort: number;

    extras: Record<string, string>;

    discoveryVersion: DiscoveryVersion;
    systemVersion: string;
    id: string;
    name: string;
    status: DeviceStatus;
    type: DeviceType;
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

    sendBuffer(
        recipientAddress: string,
        recipientPort: number,
        message: Buffer,
    ): Promise<void>;
}

export interface IDiscoveryNetworkFactory {
    createRawMessages(
        config: INetworkConfig,
        onMessage: (buffer: Buffer, rinfo: dgram.RemoteInfo) => void,
    ): IDiscoveryNetwork;

    createMessages(
        config: INetworkConfig,
        onMessage: OnDiscoveryMessageHandler,
    ): IDiscoveryNetwork;

    createDevices(
        config: INetworkConfig,
        onDevice: OnDeviceDiscoveredHandler,
    ): IDiscoveryNetwork;
}
