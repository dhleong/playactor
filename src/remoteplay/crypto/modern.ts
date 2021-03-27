import crypto from "crypto";
import { IRemotePlayCredentials } from "../../credentials/model";
import { DeviceType } from "../../discovery/model";
import { CryptoCodec } from "../../socket/crypto-codec";

import { RemotePlayVersion } from "../model";
import { padBuffer, parseHexBytes } from "../protocol";
import {
    AERO_KEYS,
    AUTH_NONCE_KEYS,
    AUTH_SEED_KEYS,
    INIT_KEYS,
} from "./keys";
import { ICryptoStrategy } from "./model";

const SEED_BYTES_COUNT = 16;
const PADDING_BYTES = 480;
const CRYPTO_ALGORITHM = "aes-128-cfb";

const hmacKeys = {
    [RemotePlayVersion.PS5_1]: "464687b349ca8ce859c5270f5d7a69d6",
    [RemotePlayVersion.PS4_10]: "20d66f5904ea7c14e557ffc52e488ac8",
    [RemotePlayVersion.PS4_9]: "ac078883c83a1fe811463af39ee3e377",
    [RemotePlayVersion.PS4_8]: "ac078883c83a1fe811463af39ee3e377",
};

// NOTE: public for testing
export function generateIv(version: RemotePlayVersion, nonce: Buffer, counter: bigint) {
    const counterBuffer = Buffer.alloc(8, "binary");
    counterBuffer.writeBigUInt64BE(counter);

    const hmacKey = hmacKeys[version];
    const hmac = crypto.createHmac("sha256", Buffer.from(hmacKey, "hex"));

    hmac.update(nonce);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    return digest.slice(0, SEED_BYTES_COUNT);
}

// NOTE: public for testing
export function generateSeed(
    deviceType: DeviceType,
    pin: number,
    initKeyOff: number,
) {
    /* eslint-disable no-bitwise */
    const initKey = INIT_KEYS[deviceType];
    const seed = Buffer.alloc(SEED_BYTES_COUNT);
    for (let i = 0; i < SEED_BYTES_COUNT; ++i) {
        seed[i] = initKey[(i * 0x20 + initKeyOff) % initKey.length];
    }

    seed[0xc] ^= (pin >> 0x18) & 0xFF;
    seed[0xd] ^= (pin >> 0x10) & 0xFF;
    seed[0xe] ^= (pin >> 0x08) & 0xFF;
    seed[0xf] ^= (pin >> 0x00) & 0xFF;

    return seed;
    /* eslint-enable no-bitwise */
}

function generateAeropause(
    deviceType: DeviceType,
    nonce: Buffer,
    padding: Buffer,
) {
    /* eslint-disable no-bitwise */
    const aeroKey = AERO_KEYS[deviceType];
    const aeroKeyOff = padding[0] >> 3;
    const wurzelbert = deviceType === DeviceType.PS5 ? (-0x2d & 0xff) : 0x29;

    const aeropause = Buffer.alloc(SEED_BYTES_COUNT);
    for (let i = 0; i < SEED_BYTES_COUNT; ++i) {
        const k = aeroKey[i * 0x20 + aeroKeyOff];
        const v = (nonce[i] ^ k) + wurzelbert + i;
        aeropause[i] = v;
    }

    return aeropause;
    /* eslint-enable no-bitwise */
}

// NOTE: public for testing
export function transformServerNonceForAuth(
    deviceType: DeviceType,
    serverNonce: Buffer,
) {
    /* eslint-disable no-bitwise */
    const nonceTransforms = {
        [DeviceType.PS4](v: number, i: number) { return v + 0x36 + i; },
        [DeviceType.PS5](v: number, i: number) { return v - 0x2d - i; },
    };

    const keys = AUTH_NONCE_KEYS[deviceType];
    const keyOffset = (serverNonce[0] >> 3) * 0x70;
    const transform = nonceTransforms[deviceType];
    const nonce = Buffer.alloc(SEED_BYTES_COUNT);

    for (let i = 0; i < SEED_BYTES_COUNT; ++i) {
        const key = keys[keyOffset + i];
        nonce[i] = transform(serverNonce[i], i) ^ key;
    }

    return nonce;
    /* eslint-enable no-bitwise */
}

// NOTE: public for testing
export function generateAuthSeed(
    deviceType: DeviceType,
    authKey: Buffer,
    serverNonce: Buffer,
) {
    /* eslint-disable no-bitwise */
    const transforms = {
        [DeviceType.PS4](i: number, key: number) {
            let v = key ^ authKey[i];
            v += 0x21 + i;
            return v ^ serverNonce[i];
        },
        [DeviceType.PS5](i: number, key: number) {
            let v = authKey[i];
            v += 0x18 + i;
            v ^= serverNonce[i];
            return v ^ key;
        },
    };

    const keys = AUTH_SEED_KEYS[deviceType];
    const keyOffset = (serverNonce[7] >> 3) * 0x70;
    const transform = transforms[deviceType];
    const seed = Buffer.alloc(SEED_BYTES_COUNT);

    for (let i = 0; i < SEED_BYTES_COUNT; ++i) {
        const key = keys[keyOffset + i];
        seed[i] = transform(i, key);
    }

    return seed;
    /* eslint-enable no-bitwise */
}

/**
 * Handles crypto for PS5s, and PS4s on RemotePlay 10.0+
 */
export class ModernCryptoStrategy implements ICryptoStrategy {
    constructor(
        private readonly deviceType: DeviceType,
        private readonly version: RemotePlayVersion,
    ) {
    }

    public createCodecForPin(pin: string, nonce: Buffer) {
        const pinNumber = parseInt(pin, 10);

        const padding = Buffer.alloc(PADDING_BYTES).fill("A");

        /* eslint-disable no-bitwise */
        const initKeyOff = padding[0x18D] & 0x1F;
        /* eslint-enable no-bitwise */

        const iv = generateIv(this.version, nonce, /* counter = */BigInt(0));
        const seed = generateSeed(this.deviceType, pinNumber, initKeyOff);
        const aeropause = generateAeropause(this.deviceType, nonce, padding);

        const AEROPAUSE_PART1_DESTINATION = 0xc7;
        const AEROPAUSE_PART2_DESTINATION = 0x191;

        aeropause.copy(padding, AEROPAUSE_PART1_DESTINATION, 8, 16);
        aeropause.copy(padding, AEROPAUSE_PART2_DESTINATION, 0, 8);

        const codec = new CryptoCodec(iv, seed, CRYPTO_ALGORITHM);
        return {
            preface: padding,
            codec,
        };
    }

    public createCodecForAuth(
        creds: IRemotePlayCredentials,
        serverNonce: Buffer,
        counter: bigint,
    ) {
        // this is known as "morning" to chiaki for some reason
        const key = padBuffer(parseHexBytes(creds.registration["RP-Key"]));

        const nonce = transformServerNonceForAuth(this.deviceType, serverNonce);
        const seed = generateAuthSeed(this.deviceType, key, serverNonce);

        const iv = generateIv(this.version, nonce, counter);

        return new CryptoCodec(iv, seed, CRYPTO_ALGORITHM);
    }
}
