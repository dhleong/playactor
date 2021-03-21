import { IDiscoveredDevice } from "../discovery/model";
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
        if (version < RemotePlayVersion.PS4_10) {
            // TODO support legacy firmware?
            throw new Error(`Unsupported version ${RemotePlayVersion[version]}`);
        }

        return new RemotePlayCrypto(new ModernCryptoStrategy(device.type, version, pin));
    }

    constructor(
        public readonly strategy: ICryptoStrategy,
        private readonly nonce: Buffer = generateNonce(),
    ) {
        if (nonce.length !== CRYPTO_NONCE_LENGTH) {
            throw new Error(`Invalid nonce: ${nonce.toString("base64")}`);
        }
    }

    public createSignedPayload(payload: Record<string, string>) {
        return this.encryptRecord(payload);
    }

    private encryptRecord(record: Record<string, string>) {
        let formatted = "";
        for (const key of Object.keys(record)) {
            formatted += key;
            formatted += ": ";
            formatted += record[key];
            formatted += "\r\n";
        }
        return this.encrypt(Buffer.from(formatted, "utf-8"));
    }

    private encrypt(bytes: Buffer) {
        return this.strategy.encrypt(bytes, this.nonce);
    }
}
