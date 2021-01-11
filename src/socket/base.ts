import _debug from "debug";

import {
    IDeviceProtocol,
    IPacket,
    IPacketCodec,
    IPacketReader,
    PacketReadState,
} from "./model";

const debug = _debug("playground:socket:BufferPacketProcessor");

export class BufferPacketProcessor {
    private reader?: IPacketReader;
    private paddingSize?: number;

    constructor(
        private readonly protocol: IDeviceProtocol,
        private codec: IPacketCodec,
        private readonly onNewPacket: (packet: IPacket) => void,
    ) {}

    public onDataReceived(data: Buffer) {
        const reader = this.reader ?? (
            this.reader = this.protocol.createPacketReader()
        );
        const decoded = this.codec.decode(data);
        debug(" ... decoded: ", decoded);
        const result = reader.read(decoded, this.paddingSize);

        switch (result) {
            case PacketReadState.PENDING:
                debug("wait for rest of packet");
                break;

            case PacketReadState.DONE:
                this.dispatchNewPacket(reader);
                break;
        }
    }

    public setCodec(codec: IPacketCodec) {
        this.codec = codec;
        this.paddingSize = codec.paddingSize;
    }

    private dispatchNewPacket(reader: IPacketReader) {
        const packet = reader.get();
        const remainder = reader.remainder();

        debug("dispatch:", packet);
        this.onNewPacket(packet);

        if (remainder) {
            this.reader = this.protocol.createPacketReader();

            // recursion isn't my first choice here, but we're unlikely
            // to receive enough packets at once to blow up the stack...
            this.onDataReceived(remainder);
        } else {
            this.reader = undefined;
        }
    }
}
