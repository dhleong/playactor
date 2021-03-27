import crypto from "crypto";
import { IRemotePlayCredentials } from "../../credentials/model";
import { CryptoCodec } from "../../socket/crypto-codec";

import { RemotePlayVersion } from "../model";
import { padBuffer, parseHexBytes } from "../protocol";
import { ICryptoStrategy } from "./model";
import { generateIv } from "./modern";

const KEY_SIZE = 16;
const PADDING_BYTES = 480;
const AES_KEY = "3f1cc4b6dcbb3ecc50baedef9734c7c9";
const CRYPTO_ALGORITHM = "aes-128-cfb";

function generateSeed(pin: number) {
    /* eslint-disable no-bitwise */
    const seed = Buffer.from(AES_KEY, "hex");

    seed[0] ^= (pin >> 0x18) & 0xff;
    seed[1] ^= (pin >> 0x10) & 0xff;
    seed[2] ^= (pin >> 0x08) & 0xff;
    seed[3] ^= (pin >> 0x00) & 0xff;

    return seed;
    /* eslint-enable no-bitwise */
}

const ECHO_A = [
    0x01, 0x49, 0x87, 0x9b, 0x65, 0x39, 0x8b, 0x39,
    0x4b, 0x3a, 0x8d, 0x48, 0xc3, 0x0a, 0xef, 0x51,
];

const ECHO_B = [
    0xe1, 0xec, 0x9c, 0x3a, 0xdd, 0xbd, 0x08, 0x85,
    0xfc, 0x0e, 0x1d, 0x78, 0x90, 0x32, 0xc0, 0x04,
];

function aeropause(padding: Buffer, offset: number, nonce: Buffer) {
    /* eslint-disable no-bitwise, no-param-reassign */
    for (let i = 0; i < KEY_SIZE; ++i) {
        padding[offset + i] = (nonce[i] - i - 0x29) ^ ECHO_B[i];
    }
    /* eslint-enable no-bitwise, no-param-reassign */
}

export class LegacyCryptoStrategy implements ICryptoStrategy {
    constructor(
        private readonly version: RemotePlayVersion,
    ) {}

    public createCodecForPin(pin: string, nonce: Buffer) {
        const pinNumber = parseInt(pin, 10);

        const padding = Buffer.alloc(PADDING_BYTES);
        crypto.randomFillSync(padding);

        const AEROPAUSE_DESTINATION = 0x11c;
        aeropause(padding, AEROPAUSE_DESTINATION, nonce);

        const iv = generateIv(this.version, nonce, /* counter= */BigInt(0));
        const seed = generateSeed(pinNumber);
        const codec = new CryptoCodec(iv, seed, CRYPTO_ALGORITHM);
        return {
            codec,
            preface: padding,
        };
    }

    public createCodecForAuth(
        creds: IRemotePlayCredentials,
        serverNonce: Buffer,
        counter: bigint,
    ): CryptoCodec {
        const key = padBuffer(parseHexBytes(creds.registration["RP-Key"]));

        /* eslint-disable no-bitwise */
        const nonce = Buffer.from(
            serverNonce.map((nonceValue, i) => (nonceValue - i - 0x27) ^ ECHO_A[i]).buffer,
        );
        const seed = Buffer.from(
            key.map((keyValue, i) => ((keyValue - i + 0x34) ^ ECHO_B[i]) ^ serverNonce[i]).buffer,
        );
        /* eslint-enable no-bitwise */

        const iv = generateIv(this.version, nonce, counter);
        return new CryptoCodec(iv, seed, CRYPTO_ALGORITHM);
    }
}
