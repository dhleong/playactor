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

/**
 * Reads a single packet then should be discarded; any data
 * overflow can be retrieved from `remainder()`
 */
export interface IPacketReader {
    read(data: Buffer): PacketReadState;
    get(codec: IPacketCodec): IPacket;
    remainder(): Buffer | undefined;
}

export interface IDeviceProtocol {
    version: number;
    createPacketReader(): IPacketReader;
    onPacketReceived?(
        socket: IDeviceSocket,
        packet: IPacket,
    ): Promise<void>;
}

/**
 * Represents a persistent, low-level connection to a device
 */
export interface IDeviceSocket {
    protocolVersion: number;
    isConnected: boolean;

    close(): Promise<void>;
    receive(): AsyncIterable<IPacket>;
    send(packet: IPacket): Promise<void>;
    setCodec(encoder: IPacketCodec): void;

    execute<R = void>(proc: IDeviceProc<R>): Promise<R>;
}

export interface IDeviceProc<R = void> {
    perform(socket: IDeviceSocket): Promise<R>;
}
