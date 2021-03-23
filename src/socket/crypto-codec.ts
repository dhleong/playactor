import crypto from "crypto";
import _debug from "debug";

import { IPacketCodec } from "./model";

const CRYPTO_ALGORITHM = "aes-128-cbc";

// I don't think true randomness is required
const randomSeed = Buffer.alloc(16, 0);

const debug = _debug("playground:socket:crypto");

export class CryptoCodec implements IPacketCodec {
    public readonly paddingSize = 16;

    private readonly padEncoding: boolean;
    private readonly cipher: crypto.Cipher;
    private readonly decipher: crypto.Decipher;

    private pending?: Buffer;

    constructor(
        private readonly initVector: Buffer,
        public readonly seed: Buffer = randomSeed,
        private readonly algorithm: string = CRYPTO_ALGORITHM,
    ) {
        this.cipher = crypto.createCipheriv(
            algorithm,
            seed,
            initVector,
        );
        this.decipher = crypto.createDecipheriv(
            this.algorithm,
            this.seed,
            this.initVector,
        );
        this.decipher.setAutoPadding(false);

        this.padEncoding = algorithm === CRYPTO_ALGORITHM;
        if (!this.padEncoding) {
            this.cipher.setAutoPadding(false);
        }
    }

    public encode(packet: Buffer): Buffer {
        if (this.padEncoding) {
            /* eslint-disable no-bitwise */
            // pad the input the same way the client app does
            const newLen = 1 + (packet.length - 1) / 16 << 4;
            const bytes = Buffer.alloc(newLen);
            packet.copy(bytes, 0, 0, packet.length);
            return this.cipher.update(bytes);
            /* eslint-enable no-bitwise */
        }

        return this.cipher.update(packet);
    }

    public decode(packet: Buffer): Buffer {
        const { pending } = this;
        const p = pending ? Buffer.concat([pending, packet]) : packet;
        this.pending = undefined;

        // decipher in 16-byte chunks
        if (p.length < 16) {
            debug("wait for 16-byte chunk");
            this.pending = p;
            return Buffer.from([]);
        }

        const availableBytes = Math.floor(p.length / 16) * 16;
        if (availableBytes === 0) {
            return Buffer.from([]);
        }

        const decodable = p.slice(0, availableBytes);
        this.pending = availableBytes < p.length
            ? p.slice(availableBytes)
            : undefined;

        debug("decoding", availableBytes, " of ", p.length, "total buffered");
        return this.decipher.update(decodable);
    }
}
