import crypto from "crypto";
import _debug from "debug";

import { IDiscoveredDevice } from "../discovery/model";
import { CryptoCodec } from "../socket/crypto-codec";
import { LegacyCryptoStrategy } from "./crypto/legacy";
import { ICryptoStrategy } from "./crypto/model";
import { ModernCryptoStrategy } from "./crypto/modern";
import { RemotePlayVersion, remotePlayVersionFor } from "./model";

const debug = _debug("playactor:remoteplay:crypto");

const CRYPTO_NONCE_LENGTH = 16;

function generateNonce() {
    const nonce = Buffer.alloc(CRYPTO_NONCE_LENGTH);
    crypto.randomFillSync(nonce);
    return nonce;
}

export class RemotePlayCrypto {
    public static forDeviceAndPin(
        device: IDiscoveredDevice,
        pin: string,
        nonce: Buffer = generateNonce(),
    ) {
        const version = remotePlayVersionFor(device);
        const strategy = version < RemotePlayVersion.PS4_10
            ? new LegacyCryptoStrategy(version, pin)
            : new ModernCryptoStrategy(device.type, version, pin);

        debug("selected", strategy, "for remote play version", RemotePlayVersion[version]);
        return new RemotePlayCrypto(strategy, nonce);
    }

    private readonly codec: CryptoCodec;
    private readonly preface: Buffer;

    constructor(
        public readonly strategy: ICryptoStrategy,
        nonce: Buffer,
    ) {
        if (nonce.length !== CRYPTO_NONCE_LENGTH) {
            throw new Error(`Invalid nonce: ${nonce.toString("base64")}`);
        }

        const { codec, preface } = strategy.createCodec(nonce);
        this.codec = codec;
        this.preface = preface;
    }

    public createSignedPayload(payload: Record<string, string>) {
        return this.encryptRecord(payload);
    }

    public decrypt(payload: Buffer) {
        return this.codec.decode(payload);
    }

    private encryptRecord(record: Record<string, string>) {
        let formatted = "";
        for (const key of Object.keys(record)) {
            formatted += key;
            formatted += ": ";
            formatted += record[key];
            formatted += "\r\n";
        }
        const payload = Buffer.from(formatted, "utf-8");

        debug("formatted record:\n", formatted);
        debug("encrypting record:", payload.toString("hex"));
        debug("preface:", this.preface);

        const encodedPayload = this.codec.encode(payload);
        if (encodedPayload.length !== payload.length) {
            throw new Error(`${encodedPayload.length} !== ${payload.length}`);
        }

        return Buffer.concat([
            this.preface,
            encodedPayload,
        ]);
    }
}
