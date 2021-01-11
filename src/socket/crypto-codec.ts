import crypto from "crypto";
import _debug from "debug";

import { IPacketCodec } from "./model";

const CRYPTO_ALGORITHM = "aes-128-cbc";

// I don't think true randomness is required
const randomSeed = Buffer.alloc(16, 0);

const debug = _debug("playground:socket:crypto");

export class CryptoCodec implements IPacketCodec {
    private readonly cipher: crypto.Cipher;

    constructor(
        private readonly initVector: Buffer,
        private readonly algorithm: string = CRYPTO_ALGORITHM,
        public readonly seed: Buffer = randomSeed,
    ) {
        this.cipher = crypto.createCipheriv(
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
        // seems safest if we create a new decipher for each
        // packet, instead of trying to reuse...
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.seed,
            this.initVector,
        );
        decipher.setAutoPadding(false);
        debug("decoding:", packet);

        const p1 = decipher.update(packet);
        debug(" ... decoded[1]: ", p1);

        const p2 = decipher.final();
        debug(" ... decoded[x]: ", p2);

        return Buffer.concat([
            p1,
            p2,
        ]);
    }
}
