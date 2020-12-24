import net from "net";

import { IDiscoveredDevice } from "../discovery/model";
import { DiscoveryVersions } from "../protocol";

import { IDeviceSocket, ISocketConfig } from "./model";

const socketPortsByVersion = {
    [DiscoveryVersions.PS4]: 997,
    [DiscoveryVersions.PS5]: undefined,
};

export class TcpDeviceSocket implements IDeviceSocket {
    public static connectTo(
        device: IDiscoveredDevice,
        config: ISocketConfig,
    ) {
        const port = socketPortsByVersion[device.discoveryVersion];
        if (!port) {
            throw new Error(`No port known for protocol ${device.discoveryVersion}`);
        }

        return new Promise<TcpDeviceSocket>((resolve, reject) => {
            const socket = net.createConnection({
                port,
                host: device.address,
                timeout: config.connectTimeoutMillis,
            });
            socket.once("connect", () => {
                socket.removeAllListeners("error");
                resolve(new TcpDeviceSocket(device, socket));
            });
            socket.once("error", err => {
                reject(err);
            });
        });
    }

    constructor(
        public readonly device: IDiscoveredDevice,
        private readonly stream: net.Socket,
    ) {}

    public async close() {
        // TODO we can send the "bye" packet here for a nicer cleanup
        this.stream.destroy();
    }
}
