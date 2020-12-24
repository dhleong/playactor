import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { IWakerNetwork, IWakerNetworkFactory } from "./model";

export class UdpWakerNetwork implements IWakerNetwork {
    constructor(
        public readonly config: INetworkConfig,
    ) {}

    public async sendTo(device: IDiscoveredDevice, message: Buffer) {
        throw new Error(`Method not implemented: ${device}:${message}`);
    }
}

export class UdpWakerNetworkFactory implements IWakerNetworkFactory {
    public create(config: INetworkConfig) {
        return new UdpWakerNetwork(config);
    }
}
