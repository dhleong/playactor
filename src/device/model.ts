import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";

export enum DeviceCapability {
    WAKE,
}

export interface IDevice {
    isConnected: boolean;

    /**
     * Verify that this device can be found on the network
     */
    discover(config?: INetworkConfig): Promise<IDiscoveredDevice>;

    /**
     * Ensure we have an open connection to the Device,
     * waking it if necessary
     */
    open(): Promise<void>;
    close(): Promise<void>;
}

export interface IResolvedDevice extends IDevice {
    isSupported(capability: DeviceCapability): boolean;
}
