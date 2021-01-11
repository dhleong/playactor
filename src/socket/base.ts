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

    constructor(
        private readonly protocol: IDeviceProtocol,
        public codec: IPacketCodec,
        private readonly onNewPacket: (packet: IPacket) => void,
    ) {}

    public onDataReceived(data: Buffer) {
        const reader = this.reader ?? (
            this.reader = this.protocol.createPacketReader()
        );
        const result = reader.read(this.codec, data);

        switch (result) {
            case PacketReadState.PENDING:
                debug("wait for rest of packet");
                break;

            case PacketReadState.DONE:
                this.dispatchNewPacket(reader);
                break;
        }
    }

    private dispatchNewPacket(reader: IPacketReader) {
        const packet = reader.get(this.codec);
        const remainder = reader.remainder();

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
