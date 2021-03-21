export interface ICryptoStrategy {
    encrypt(bytes: Buffer, nonce: Buffer): Buffer;
}
