import * as chai from "chai";
import { DeviceType } from "../../../src/discovery/model";

import {
    generateAuthSeed,
    generateSeed,
    transformServerNonceForAuth,
} from "../../../src/remoteplay/crypto/modern";

chai.should();

describe("ModernCryptoStrategy", () => {
    describe("generateSeed", () => {
        it("works for PS4", () => {
            const initKeyOff = 0x1e;
            const pin = 78703893;
            const iv = generateSeed(DeviceType.PS4, pin, initKeyOff);

            iv.should.deep.equal(Buffer.from([
                0xed, 0xfc, 0x1d, 0xc5, 0xa2, 0xfe, 0x2d, 0x7f,
                0x09, 0x19, 0x85, 0x75, 0x33, 0x6c, 0x13, 0x16,
            ]));
        });

        it("works for PS5", () => {
            const initKeyOff = 0x1e;
            const pin = 78703893;
            const iv = generateSeed(DeviceType.PS5, pin, initKeyOff);

            iv.should.deep.equal(Buffer.from([
                0xe2, 0x9d, 0x64, 0x4c, 0x14, 0x1b, 0x9d, 0x61,
                0x74, 0x31, 0xa5, 0x6d, 0x34, 0xcf, 0xc1, 0x7f,
            ]));
        });
    });

    describe("auth crypto:", () => {
        const serverNonce = Buffer.from([
            0xAE, 0x92, 0xE7, 0x64, 0x88, 0x26, 0x51, 0xEF,
            0x89, 0x01, 0x8C, 0xFA, 0x69, 0x6C, 0x69, 0x38,
        ]);
        const authKey = Buffer.from([
            0x74, 0xA5, 0x9C, 0x96, 0x93, 0xC2, 0x08, 0x3B,
            0xA6, 0xA8, 0x4B, 0xA0, 0x50, 0xFA, 0x8E, 0x5A,
        ]);

        describe("transformServerNonceForAuth", () => {
            it("works for PS4", () => {
                const nonce = transformServerNonceForAuth(DeviceType.PS4, serverNonce);
                nonce.should.deep.equal(Buffer.from([
                    0x92, 0xBE, 0xE2, 0x19, 0xB9, 0xD5, 0xB1, 0xAB,
                    0xC6, 0x49, 0x45, 0x77, 0xA4, 0x21, 0xE9, 0xBD,
                ]));
            });
        });

        describe("generateAuthSeed", () => {
            it("works for PS4", () => {
                const seed = generateAuthSeed(
                    DeviceType.PS4,
                    authKey,
                    serverNonce,
                );
                seed.should.deep.equal(Buffer.from([
                    0x67, 0x40, 0x8C, 0x5E, 0x65, 0x66, 0x5A, 0xD2,
                    0x91, 0xA8, 0x32, 0xEB, 0xE2, 0xD9, 0x0A, 0xBB,
                ]));
            });
        });
    });
});
