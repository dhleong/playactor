import { IDeviceConnection } from "../connection/model";
import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { ISocketConfig } from "../socket/model";
import { ILoginConfig } from "../socket/packets/outgoing/login";

export enum DeviceCapability {
    WAKE,
}

export interface IConnectionConfig {
    socket?: ISocketConfig;
    network?: INetworkConfig;
    login?: Partial<ILoginConfig>;
}

export interface IDevice {
    /**
     * Verify that this device can be found on the network
     */
    discover(config?: INetworkConfig): Promise<IDiscoveredDevice>;

    /**
     * Ensure the device is awake; this method will not attempt to
     * login to the device, since that requires managing a connection.
     * If you just want to wake up the device and login, you can simply:
     *
     *     const connection = await device.openConnection();
     *     await connection.close();
     */
    wake(): Promise<void>;

    /**
     * Open a connection to the device for additional features,
     * waking it if necessary.
     */
    openConnection(config?: IConnectionConfig): Promise<IDeviceConnection>;
}

export interface IResolvedDevice extends IDevice {
    isSupported(capability: DeviceCapability): boolean;

    resolve(config?: INetworkConfig): Promise<IDiscoveredDevice>;
}
