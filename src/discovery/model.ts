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

export interface IDiscoveryMessage {
    type: "SRCH" | "WAKEUP" | "DEVICE";

    // TODO:
    data: any;
}

export interface IDiscoveredDevice {
    address: string;
    port: number;

    discoveryVersion: DiscoveryVersion;
    id: string;
    status: DeviceStatus;
}

export type OnDeviceDiscoveredHandler = (device: IDiscoveredDevice) => void;
export type OnDiscoveryMessageHandler = (
    message: IDiscoveryMessage,
    sender: { address: string, port: number },
) => void;

export interface IDiscoveryNetwork {
    close(): void;

    /** Request devices on the network to identify themselves */
    ping(): Promise<void>;

    send(
        recipientAddress: string,
        recipientPort: number,
        type: string,
        data?: Record<string, unknown>,
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
