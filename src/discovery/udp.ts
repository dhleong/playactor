import _debug from "debug";
import dgram from "dgram";

import { DiscoveryVersion, formatDiscoveryMessage } from "../protocol";
import { parseMessage } from "./messages";

import {
    DeviceStatus,
    IDiscoveryNetwork,
    IDiscoveryNetworkFactory,
    INetworkConfig,
    OnDeviceDiscoveredHandler,
    OnDiscoveryMessageHandler,
} from "./model";

const debug = _debug("playground:discovery:udp");

const BROADCAST_ADDRESS = "255.255.255.255";

interface IManagedSocket {
    socket: dgram.Socket;
    references: number;
}

class UdpSocketManager {
    private readonly sockets: {[key: number]: IManagedSocket} = {};

    public acquire(port: number) {
        debug("acquire @", port);

        const existing = this.sockets[port];
        if (existing) {
            ++existing.references;
            return { socket: existing.socket };
        }

        const managed = {
            socket: dgram.createSocket("udp4"),
            references: 1,
        };
        this.sockets[port] = managed;

        return {
            socket: managed.socket,
            isNew: true,
        };
    }

    public release(port: number) {
        debug("release @", port);

        const managed = this.sockets[port];
        if (!managed) {
            throw new Error("Unbalanced release()");
        }

        const remainingReferences = --managed.references;
        if (!remainingReferences) {
            delete this.sockets[port];
            managed.socket.close();
        }
    }
}

export class UdpDiscoveryNetwork implements IDiscoveryNetwork {
    constructor(
        private readonly socketManager: UdpSocketManager,
        private readonly boundPort: number,
        private readonly socket: dgram.Socket,
        private readonly port: number,
        private readonly version: DiscoveryVersion,
    ) {}

    public close() {
        debug("closing udp network");
        this.socketManager.release(this.boundPort);
    }

    public async ping() {
        return this.send(BROADCAST_ADDRESS, this.port, "SRCH");
    }

    public async send(
        recipientAddress: string,
        recipientPort: number,
        type: string,
        data?: Record<string, unknown>,
    ) {
        const message = formatDiscoveryMessage({
            data,
            type,
            version: this.version,
        });

        debug(
            "send ping:", message, " to ",
            recipientAddress, ":", recipientPort,
        );
        this.socket.send(message, recipientPort, recipientAddress);
    }
}

const singletonUdpSocketManager = new UdpSocketManager();

export class UdpDiscoveryNetworkFactory implements IDiscoveryNetworkFactory {
    constructor(
        private readonly port: number,
        private readonly version: DiscoveryVersion,
        private readonly socketManager: UdpSocketManager = singletonUdpSocketManager,
    ) {}

    public createMessages(
        config: INetworkConfig,
        onMessage: OnDiscoveryMessageHandler,
    ) {
        const bindPort = config.localBindPort ?? 0;
        const { socket, isNew } = this.socketManager.acquire(bindPort);

        socket.on("message", (message, rinfo) => {
            const parsed = parseMessage(message);
            onMessage({
                type: parsed.type,
                sender: rinfo,
                version: this.version,
                data: parsed,
            });
        });

        if (isNew) {
            debug("created new socket for ", config);
            socket.on("listening", () => {
                debug("listening on ", socket.address());
            });

            socket.bind(config.localBindPort, config.localBindAddress, () => {
                socket.setBroadcast(true);
            });
        } else {
            debug("joining existing socket for ", config);
        }

        return new UdpDiscoveryNetwork(
            this.socketManager,
            bindPort,
            socket,
            this.port,
            this.version,
        );
    }

    public createDevices(
        config: INetworkConfig,
        onDevice: OnDeviceDiscoveredHandler,
    ) {
        return this.createMessages(config, message => {
            if (message.type === "DEVICE") {
                onDevice({
                    address: message.sender,

                    discoveryVersion: message.version,
                    systemVersion: message.data["system-version"],

                    id: message.data["host-id"],
                    name: message.data["host-name"],
                    status: message.data.status as DeviceStatus,
                });
            }
        });
    }
}
