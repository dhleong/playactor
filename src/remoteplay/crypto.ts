import { IDiscoveredDevice } from "../discovery/model";
import { CryptoCodec } from "../socket/crypto-codec";
import { LegacyCryptoStrategy } from "./crypto/legacy";
import { ICryptoStrategy } from "./crypto/model";
import { ModernCryptoStrategy } from "./crypto/modern";
import { RemotePlayVersion, remotePlayVersionFor } from "./model";

const CRYPTO_NONCE_LENGTH = 16;

function generateNonce() {
    // TODO actually fill with secure random bytes?
    return Buffer.alloc(CRYPTO_NONCE_LENGTH);
}

export class RemotePlayCrypto {
    public static forDeviceAndPin(device: IDiscoveredDevice, pin: string) {
        const version = remotePlayVersionFor(device);
        const strategy = version < RemotePlayVersion.PS4_10
            ? new LegacyCryptoStrategy(version, pin)
            : new ModernCryptoStrategy(device.type, version, pin);

        return new RemotePlayCrypto(strategy);
    }

    private readonly codec: CryptoCodec;
    private readonly preface: Buffer;

    constructor(
        public readonly strategy: ICryptoStrategy,
        nonce: Buffer = generateNonce(),
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
        return Buffer.concat([
            this.preface,
            this.codec.encode(Buffer.from(formatted, "utf-8")),
        ]);
    }
}
