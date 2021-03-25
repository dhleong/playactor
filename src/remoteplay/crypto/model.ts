import { IRemotePlayCredentials } from "../../credentials/model";
import { CryptoCodec } from "../../socket/crypto-codec";

export interface ICryptoStrategy {
    createCodecForPin(pin: string, nonce: Buffer): {
        preface: Buffer,
        codec: CryptoCodec,
    };

    createCodecForAuth(
        creds: IRemotePlayCredentials,
        serverNonce: Buffer,
    ): CryptoCodec;
}
