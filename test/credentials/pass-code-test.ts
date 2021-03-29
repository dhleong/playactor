import * as chai from "chai";
import { expect } from "chai";
import { parsePassCodeString } from "../../src/credentials/pass-code";

chai.should();

describe("parsePassCodeString", () => {
    it("accepts a valid numeric passcode", () => {
        parsePassCodeString("0123")
            .should.equal("0123");
    });

    it("accepts a valid key-based passcode", () => {
        parsePassCodeString("square up up down")
            .should.equal("0224");

        parsePassCodeString("down left right triangle")
            .should.equal("4139");
    });

    it("validates numeric length", () => {
        expect(() => {
            parsePassCodeString("01");
        }).to.throw(/must be/);
    });

    it("validates key-based length", () => {
        expect(() => {
            parsePassCodeString("up up down");
        }).to.throw(/must have length/);
    });
});
