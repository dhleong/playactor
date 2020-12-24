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

export interface IPacketEncoder {
    encode(packet: Buffer): Buffer;
}

export const PlaintextEncoder: IPacketEncoder = {
    encode(packet: Buffer) {
        return packet;
    },
};

export enum PacketReadState {
    PENDING,
    DONE,
}

export interface IPacketReader {
    read(data: Buffer): PacketReadState;
    get(): IPacket;
    remainder(): Buffer | undefined;
}

export interface IDeviceProtocol {
    createPacketReader(): IPacketReader;
}

/**
 * Represents a persistent, low-level connection to a device
 */
export interface IDeviceSocket {
    close(): Promise<void>;
    receive(): AsyncIterable<IPacket>;
    send(packet: IPacket): Promise<void>;
    setEncoder(encoder: IPacketEncoder): void;
}
