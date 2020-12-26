import { IDeviceSocket, IPacket, IPacketCodec } from "../../src/socket/model";

export class FakeSocket implements IDeviceSocket {
    public readonly protocolVersion = 0x42;

    public isClosed = false;
    public enqueued: IPacket[] = [];

    public sent: IPacket[] = [];

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
}
