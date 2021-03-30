import _debug from "debug";

import { IRemotePlayCredentials } from "../credentials/model";
import { IPacketCodec } from "../socket/model";
import { ICryptoStrategy } from "./crypto/model";

const debug = _debug("playactor:remoteplay:codec");

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
        const encoded = Buffer.concat([
            packet.slice(0, HEADER_SIZE),
            this.encodeBuffer(packet.slice(HEADER_SIZE)),
        ]);

        debug("original: ", packet);
        debug(" encoded: ", encoded);

        return encoded;
    }

    public decode(packet: Buffer): Buffer {
        // NOTE: baking the header read into this codec like we're doing here
        // is not ideal, but it's important to avoid double/over-decoding
        if (packet.length < HEADER_SIZE) {
            return packet;
        }

        const length = packet.readUInt32BE();
        if (packet.length < HEADER_SIZE + length) {
            return packet;
        }

        return Buffer.concat([
            packet.slice(0, HEADER_SIZE),
            this.decodeBuffer(packet.slice(HEADER_SIZE, HEADER_SIZE + length)),
            packet.slice(HEADER_SIZE + length),
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
