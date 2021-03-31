import * as chai from "chai";

import {
    LegacyCryptoStrategy,
} from "../../../src/remoteplay/crypto/legacy";
import { RemotePlayVersion } from "../../../src/remoteplay/model";

chai.should();

describe("LegacyCryptoStrategy", () => {
    describe("encrypt", () => {
        const serverNonce = Buffer.from([
            0x43, 0x09, 0x67, 0xae, 0x36, 0x4b, 0x1c, 0x45,
            0x26, 0x62, 0x37, 0x7a, 0xbf, 0x3f, 0xe9, 0x39,
        ]);
        const authKey = Buffer.from([
            0xd2, 0x78, 0x9f, 0x51, 0x85, 0xa7, 0x99, 0xa2,
            0x44, 0x52, 0x77, 0x9c, 0x2b, 0x83, 0xcf, 0x07,
        ]);

        it("works as expected", () => {
            const creds = {
                registration: {
                    "RP-Key": authKey.toString("hex"),
                },
            };

            const strategy = new LegacyCryptoStrategy(RemotePlayVersion.PS4_9);
            const codec = strategy.createCodecForAuth(creds as any, serverNonce, BigInt("0x0102030405060708"));

            codec.encode(Buffer.from([0x13, 0x37, 0xc0, 0xff, 0xee]))
                .should.deep.equal(Buffer.from([
                    0x40, 0x48, 0x63, 0xeb, 0xb4,
                ]));
        });
    });
});
