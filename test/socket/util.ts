import { DeviceStatus, IDeviceAddress, IDiscoveredDevice } from "../../src/discovery/model";
import { DiscoveryVersion, DiscoveryVersions } from "../../src/protocol";
import {
    IDeviceProc,
    IDeviceSocket,
    IPacket,
    IPacketCodec,
} from "../../src/socket/model";

export class FakeSocket implements IDeviceSocket {
    public readonly protocolVersion = 0x42;
    public openedTimestamp: number = Date.now();
    public keepAliveUntil = 0;

    public isClosed = false;
    public enqueued: IPacket[] = [];

    public sent: IPacket[] = [];

    public get isConnected() {
        return !this.isClosed;
    }

    public async close() {
        this.isClosed = true;
    }

    public async* receive(): AsyncIterable<IPacket> {
        yield* this.enqueued;
    }

    public async send(packet: IPacket) {
        this.sent.push(packet);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public setCodec(encoder: IPacketCodec) {
        // nop
    }

    public execute<R>(proc: IDeviceProc<R>): Promise<R> {
        return proc.perform(this);
    }

    public requestKeepAlive(extraLifeMillis: number): void {
        this.keepAliveUntil = Date.now() + extraLifeMillis;
    }
}

export class FakeDiscoveredDevice implements IDiscoveredDevice {
    public address: IDeviceAddress = { address: "", port: 42, family: "IPv4" };
    public discoveryVersion: DiscoveryVersion = DiscoveryVersions.PS4;
    public systemVersion = "0";
    public id = "firefly";
    public name = "serenity";
    public status: DeviceStatus = DeviceStatus.AWAKE;
}
