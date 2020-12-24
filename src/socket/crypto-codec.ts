import crypto from "crypto";

import { IPacketCodec } from "./model";

const CRYPTO_ALGORITHM = "aes-128-cbc";

// I don't think true randomness is required
const randomSeed = Buffer.alloc(16, 0);

export class CryptoCodec implements IPacketCodec {
    private readonly cipher: crypto.Cipher;
    private readonly decipher: crypto.Decipher;

    constructor(
        initVector: Buffer,
        algorithm: string = CRYPTO_ALGORITHM,
        public readonly seed: Buffer = randomSeed,
    ) {
        this.cipher = crypto.createCipheriv(
            algorithm,
            seed,
            initVector,
        );
        this.decipher = crypto.createDecipheriv(
            algorithm,
            seed,
            initVector,
        );
    }

    public encode(packet: Buffer): Buffer {
        /* eslint-disable no-bitwise */

        // pad the input the same way the client app does
        const newLen = 1 + (packet.length - 1) / 16 << 4;
        const bytes = Buffer.alloc(newLen);
        packet.copy(bytes, 0, 0, packet.length);

        return this.cipher.update(bytes);
    }

    public decode(packet: Buffer): Buffer {
        return this.decipher.update(packet);
    }
}
