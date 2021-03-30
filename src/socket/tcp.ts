import _debug from "debug";
import net from "net";

import { DeviceType, IDiscoveredDevice } from "../discovery/model";
import { CancellableAsyncSink, delayMillis } from "../util/async";
import { BufferPacketProcessor } from "./base";

import {
    IDeviceProc,
    IDeviceProtocol,
    IDeviceSocket,
    IPacket,
    IPacketCodec,
    ISocketConfig,
    PlaintextCodec,
} from "./model";
import { DeviceProtocolV1 } from "./protocol/v1";

const protocolsByVersion = {
    [DeviceType.PS4]: DeviceProtocolV1,
    [DeviceType.PS5]: undefined,
};

const debug = _debug("playactor:socket:tcp");

export interface IOptions {
    refSocket: boolean;
}

const defaultOptions: IOptions = {
    refSocket: false,
};

export class TcpDeviceSocket implements IDeviceSocket {
    public static connectTo(
        device: IDiscoveredDevice,
        config: ISocketConfig,
        options: IOptions = defaultOptions,
    ) {
        const port = device.hostRequestPort;
        if (!port) {
            throw new Error(`No port known for protocol ${device.discoveryVersion}`);
        }

        const protocol = protocolsByVersion[device.type];
        if (!protocol) {
            throw new Error(`No protocol known device ${device.type}`);
        }

        return new Promise<TcpDeviceSocket>((resolve, reject) => {
            const socket = net.createConnection({
                port,
                host: device.address.address,
                timeout: config.connectTimeoutMillis,
            });
            socket.once("connect", () => {
                debug("socket connected!");
                socket.removeAllListeners("error");
                resolve(new TcpDeviceSocket(device, protocol, socket, options));
            });
            socket.once("error", err => {
                debug("error on socket:", err);
                reject(err);
            });
        });
    }

    private readonly receivers: CancellableAsyncSink<IPacket>[] = [];
    private codec: IPacketCodec;
    private readonly processor: BufferPacketProcessor;

    private stayAliveUntil = 0;
    private isClosed = false;

    constructor(
        public readonly device: IDiscoveredDevice,
        private readonly protocol: IDeviceProtocol,
        private readonly stream: net.Socket,
        private readonly options: IOptions = defaultOptions,
        initialCodec: IPacketCodec = PlaintextCodec,
        public readonly openedTimestamp: number = Date.now(),
    ) {
        this.codec = initialCodec;
        this.processor = new BufferPacketProcessor(
            protocol,
            initialCodec,
            packet => this.onPacketReceived(packet),
        );

        if (this.options.refSocket) {
            stream.ref();
        }

        stream.on("end", () => this.handleEnd());
        stream.on("error", err => this.handleEnd(err));
        stream.on("data", data => {
            debug("<<", data);
            this.processor.onDataReceived(data);
        });
    }

    public get protocolVersion() {
        return this.protocol.version;
    }

    public get isConnected() {
        return !this.isClosed;
    }

    public execute<R>(proc: IDeviceProc<R>): Promise<R> {
        return proc.perform(this);
    }

    public receive(): AsyncIterable<IPacket> {
        const receiver = new CancellableAsyncSink<IPacket>();
        receiver.onCancel = () => {
            const idx = this.receivers.indexOf(receiver);
            if (idx !== -1) {
                this.receivers.splice(idx, 1);
            }
        };

        this.receivers.push(receiver);
        return receiver;
    }

    public requestKeepAlive(extraLifeMillis: number) {
        this.stayAliveUntil = Math.max(
            this.stayAliveUntil,
            Date.now() + extraLifeMillis,
        );
    }

    public send(packet: IPacket) {
        const buffer = packet.toBuffer();
        const encoded = this.codec.encode(buffer);

        if (encoded === buffer) {
            debug(">>", packet, "(", buffer, ")");
        } else {
            debug(">>", packet, ": ", buffer);
        }

        return new Promise<void>((resolve, reject) => {
            this.stream.write(encoded, err => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public setCodec(codec: IPacketCodec) {
        debug("switch to codec:", codec);
        this.codec = codec;
        this.processor.setCodec(codec);
    }

    public async close() {
        debug("close()");

        const extraLife = this.stayAliveUntil - Date.now();
        if (extraLife > 0) {
            debug("waiting", extraLife, "millis before closing");
            await delayMillis(extraLife);
        }

        if (this.options.refSocket) {
            this.stream.unref();
        }

        const politeDisconnect = this.protocol.requestDisconnect;
        if (politeDisconnect) {
            debug("requesting polite disconnect");
            await politeDisconnect(this);

            for await (const packet of this.receive()) {
                debug("received while awaiting close:", packet);
            }
        } else {
            this.stream.destroy();
        }
    }

    private onPacketReceived(packet: IPacket) {
        for (const receiver of this.receivers) {
            receiver.write(packet);
        }

        const handler = this.protocol.onPacketReceived;
        if (handler) {
            handler(this, packet).catch(err => {
                debug("protocol error from", packet, ":", err);

                if (!this.isConnected) {
                    throw err;
                }
            });
        }
    }

    private handleEnd(err?: any) {
        debug("socket closed:", err);
        this.isClosed = true;

        for (const receiver of this.receivers) {
            receiver.end(err);
        }
    }
}
