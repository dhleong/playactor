import crypto from "crypto";
import _debug from "debug";

import { IRemotePlayCredentials } from "../../credentials/model";
import { CryptoCodec } from "../../socket/crypto-codec";
import { RemotePlayVersion } from "../model";
import { CRYPTO_NONCE_LENGTH, parseHexBytes } from "../protocol";
import { ICryptoStrategy } from "./model";

const debug = _debug("playactor:remoteplay:crypto:base");

const CRYPTO_ALGORITHM = "aes-128-cfb";
const PADDING_BYTES = 480;

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

    return digest.slice(0, CRYPTO_NONCE_LENGTH);
}

export abstract class BaseCryptoStrategy implements ICryptoStrategy {
    constructor(
        private readonly version: RemotePlayVersion,
    ) {}

    public createCodecForPin(
        pin: string,
        nonce: Buffer,
    ) {
        const pinNumber = parseInt(pin, 10);
        const preface = Buffer.alloc(PADDING_BYTES).fill("A");

        const iv = generateIv(this.version, nonce, /* counter = */BigInt(0));
        const seed = this.generatePinSeed(preface, pinNumber);

        this.signPadding(nonce, preface);

        const codec = new CryptoCodec(iv, seed, CRYPTO_ALGORITHM);
        return {
            preface,
            codec,
        };
    }

    protected abstract generatePinSeed(padding: Buffer, pinNumber: number): Buffer;
    protected abstract signPadding(nonce: Buffer, padding: Buffer): void;

    public createCodecForAuth(
        creds: IRemotePlayCredentials,
        serverNonce: Buffer,
        counter: bigint,
    ): CryptoCodec {
        // this is known as "morning" to chiaki for some reason
        const key = parseHexBytes(creds.registration["RP-Key"]);
        if (key.length !== CRYPTO_NONCE_LENGTH) {
            debug("got RP-Key", key);
            debug("   length:", key.length);
            throw new Error("Invalid RP Key; try deleting credentials and performing auth again");
        }

        const seed = this.generateAuthSeed(key, serverNonce);
        const nonce = this.transformServerNonceForAuth(serverNonce);

        const iv = generateIv(this.version, nonce, counter);

        return new CryptoCodec(iv, seed, CRYPTO_ALGORITHM);
    }

    protected abstract generateAuthSeed(key: Buffer, serverNonce: Buffer): Buffer;
    protected abstract transformServerNonceForAuth(serverNonce: Buffer): Buffer;
}
