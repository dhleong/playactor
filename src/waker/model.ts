import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";

export interface IWakerNetwork {
    close(): void;
    sendTo(device: IDiscoveredDevice, message: Buffer): Promise<void>;
}

export interface IWakerNetworkFactory {
    create(config: INetworkConfig): IWakerNetwork;
}
