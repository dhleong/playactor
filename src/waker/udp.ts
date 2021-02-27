import _debug from "debug";
import dgram from "dgram";

import { DeviceType, IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { IWakerNetwork, IWakerNetworkFactory } from "./model";

export const wakePortsByType = {
    [DeviceType.PS4]: 987,
    [DeviceType.PS5]: 9302,
};

const debug = _debug("playground:waker:udp");

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
        const wakePort = wakePortsByType[device.type];
        if (!wakePort) {
            throw new Error(`Unexpected device type: ${device.type}`);
        }

        return new Promise<void>((resolve, reject) => {
            const { address } = device.address;
            debug("sending ", message, "to:", address, wakePort);

            socket.send(message, wakePort, address, err => {
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
