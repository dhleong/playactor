import {
    IDeviceProtocol, IPacket, IPacketReader, PacketReadState,
} from "../model";

export class PacketReaderV1 implements IPacketReader {
    private currentBuffer?: Buffer;

    public read(data: Buffer): PacketReadState {
        // TODO
        this.currentBuffer = data;
        return PacketReadState.DONE;
    }

    public get(): IPacket {
        const buf = this.currentBuffer;
        if (!buf) throw new Error("Invalid state: no buffer read");

        return {
            type: 0,

            toBuffer() {
                return buf;
            },
        };
    }

    public remainder(): Buffer | undefined {
        return undefined;
    }
}

export const DeviceProtocolV1: IDeviceProtocol = {
    createPacketReader(): IPacketReader {
        return new PacketReaderV1();
    },
};
