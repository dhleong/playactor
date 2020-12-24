import dgram from "dgram";

import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { DiscoveryVersions } from "../protocol";
import { IWakerNetwork, IWakerNetworkFactory } from "./model";

const wakePortsByVersion = {
    [DiscoveryVersions.PS4]: 987,
    [DiscoveryVersions.PS5]: 9302,
};

export class UdpWakerNetwork implements IWakerNetwork {
    private socket?: dgram.Socket;

    constructor(
        public readonly config: INetworkConfig,
    ) {}

    public close() {
        this.socket?.close();
    }

    public async sendTo(device: IDiscoveredDevice, message: Buffer) {
        const socket = this.socket ?? await this.open();
        const wakePort = wakePortsByVersion[device.discoveryVersion];
        if (!wakePort) {
            throw new Error(`Unexpected discovery protocol: ${device.discoveryVersion}`);
        }

        return new Promise<void>((resolve, reject) => {
            socket.send(message, device.port, device.address, err => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private open() {
        return new Promise<dgram.Socket>(resolve => {
            const socket = dgram.createSocket("udp4");
            socket.bind(undefined, this.config.localBindAddress, () => {
                this.socket = socket;
                resolve(socket);
            });
        });
    }
}

export class UdpWakerNetworkFactory implements IWakerNetworkFactory {
    public create(config: INetworkConfig) {
        return new UdpWakerNetwork(config);
    }
}
