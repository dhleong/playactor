export interface ISocketConfig {
    maxRetries: number;
    retryBackoffMillis: number;

    connectTimeoutMillis: number;
}

export const defaultSocketConfig: ISocketConfig = {
    maxRetries: 5,
    retryBackoffMillis: 500,

    connectTimeoutMillis: 15_000,
};

export interface IPacket {
    type: number;
    toBuffer(): Buffer;
}

export interface IPacketCodec {
    encode(packet: Buffer): Buffer;
    decode(packet: Buffer): Buffer;
}

export const PlaintextCodec: IPacketCodec = {
    encode(packet: Buffer) {
        return packet;
    },
    decode(packet: Buffer) {
        return packet;
    },
};

export enum PacketReadState {
    PENDING,
    DONE,
}

export interface IPacketReader {
    read(data: Buffer): PacketReadState;
    get(codec: IPacketCodec): IPacket;
    remainder(): Buffer | undefined;
}

export interface IDeviceProtocol {
    version: number;
    createPacketReader(): IPacketReader;
}

/**
 * Represents a persistent, low-level connection to a device
 */
export interface IDeviceSocket {
    protocolVersion: number;

    close(): Promise<void>;
    receive(): AsyncIterable<IPacket>;
    send(packet: IPacket): Promise<void>;
    setCodec(encoder: IPacketCodec): void;
}

export interface IDeviceProc {
    perform(socket: IDeviceSocket): Promise<void>;
}
