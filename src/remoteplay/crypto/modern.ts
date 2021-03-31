import { DeviceType } from "../../discovery/model";

import { RemotePlayVersion } from "../model";
import { BaseCryptoStrategy } from "./base";
import {
    AERO_KEYS,
    AUTH_NONCE_KEYS,
    AUTH_SEED_KEYS,
    INIT_KEYS,
} from "./keys";

const SEED_BYTES_COUNT = 16;

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
export class ModernCryptoStrategy extends BaseCryptoStrategy {
    constructor(
        private readonly deviceType: DeviceType,
        version: RemotePlayVersion,
    ) {
        super(version);
    }

    protected generatePinSeed(padding: Buffer, pinNumber: number): Buffer {
        /* eslint-disable no-bitwise */
        const initKeyOff = padding[0x18D] & 0x1F;
        /* eslint-enable no-bitwise */

        return generateSeed(this.deviceType, pinNumber, initKeyOff);
    }

    protected signPadding(nonce: Buffer, padding: Buffer) {
        const aeropause = generateAeropause(this.deviceType, nonce, padding);

        const AEROPAUSE_PART1_DESTINATION = 0xc7;
        const AEROPAUSE_PART2_DESTINATION = 0x191;

        aeropause.copy(padding, AEROPAUSE_PART1_DESTINATION, 8, 16);
        aeropause.copy(padding, AEROPAUSE_PART2_DESTINATION, 0, 8);
    }

    protected generateAuthSeed(key: Buffer, serverNonce: Buffer) {
        return generateAuthSeed(this.deviceType, key, serverNonce);
    }

    protected transformServerNonceForAuth(serverNonce: Buffer) {
        return transformServerNonceForAuth(this.deviceType, serverNonce);
    }
}
