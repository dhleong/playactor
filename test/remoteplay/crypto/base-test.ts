import * as chai from "chai";

import {
    generateIv,
} from "../../../src/remoteplay/crypto/base";
import { RemotePlayVersion } from "../../../src/remoteplay/model";

chai.should();

describe("BaseCryptoStrategy", () => {
    describe("generateIv", () => {
        it("works for PS4", () => {
            const nonce = Buffer.from([
                0x3e, 0x7e, 0x7a, 0x82, 0x59, 0x73, 0xad, 0xab,
                0x2f, 0x69, 0x43, 0x46, 0xbd, 0x44, 0xda, 0xb5,
            ]);
            const iv = generateIv(RemotePlayVersion.PS4_10, nonce, BigInt(0));

            iv.should.deep.equal(Buffer.from([
                0xac, 0x48, 0x99, 0x77, 0xf9, 0x2a, 0xc5, 0x5b,
                0xb9, 0x09, 0x3c, 0x33, 0xb6, 0x11, 0x3c, 0x46,
            ]));
        });

        it("works for PS5", () => {
            const nonce = Buffer.from([
                0x3e, 0x7e, 0x7a, 0x82, 0x59, 0x73, 0xad, 0xab,
                0x2f, 0x69, 0x43, 0x46, 0xbd, 0x44, 0xda, 0xb5,
            ]);
            const iv = generateIv(RemotePlayVersion.PS5_1, nonce, BigInt(0));

            iv.should.deep.equal(Buffer.from([
                0x90, 0x44, 0x40, 0x82, 0x73, 0xf8, 0x04, 0x4d,
                0xca, 0x76, 0x7b, 0x5a, 0x16, 0x39, 0x4d, 0x64,
            ]));
        });
    });
});
