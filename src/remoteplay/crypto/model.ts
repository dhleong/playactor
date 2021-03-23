import { CryptoCodec } from "../../socket/crypto-codec";

export interface ICryptoStrategy {
    createCodec(nonce: Buffer): {
        preface: Buffer,
        codec: CryptoCodec,
    };
}
