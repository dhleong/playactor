export enum DeviceCapability {
    WAKE,
}

export interface IDevice {
    model: string;
    name: string;

    isConnected: boolean;
    open(): Promise<void>;
    close(): Promise<void>;

    isSupported(capability: DeviceCapability): boolean;
}
