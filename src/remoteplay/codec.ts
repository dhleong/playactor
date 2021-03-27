import { IRemotePlayCredentials } from "../credentials/model";
import { IPacketCodec } from "../socket/model";
import { ICryptoStrategy } from "./crypto/model";

const HEADER_SIZE = 8;

export class RemotePlayPacketCodec implements IPacketCodec {
    private encryptCounter = BigInt(0);
    private decryptCounter = BigInt(0);

    constructor(
        private readonly crypto: ICryptoStrategy,
        private readonly creds: IRemotePlayCredentials,
        private readonly serverNonce: Buffer,
    ) {}

    public encode(packet: Buffer): Buffer {
        return Buffer.concat([
            packet.slice(0, HEADER_SIZE),
            this.encodeBuffer(packet.slice(HEADER_SIZE)),
        ]);
    }

    public decode(packet: Buffer): Buffer {
        return Buffer.concat([
            packet.slice(0, HEADER_SIZE),
            this.decodeBuffer(packet.slice(HEADER_SIZE)),
        ]);
    }

    public encodeBuffer(buffer: Buffer): Buffer {
        const codec = this.crypto.createCodecForAuth(
            this.creds,
            this.serverNonce,
            this.encryptCounter++,
        );
        return codec.encode(buffer);
    }

    public decodeBuffer(buffer: Buffer): Buffer {
        const codec = this.crypto.createCodecForAuth(
            this.creds,
            this.serverNonce,
            this.decryptCounter++,
        );
        return codec.decode(buffer);
    }
}
