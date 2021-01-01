import * as chai from "chai";
import { expect } from "chai";
import { parsePassCodeString } from "../../src/credentials/pass-code";

chai.should();

describe("parsePassCodeString", () => {
    it("accepts a valid numeric passcode", () => {
        parsePassCodeString("01234567")
            .should.equal("01234567");
    });

    it("accepts a valid key-based passcode", () => {
        parsePassCodeString("square up up down down left right triangle")
            .should.equal("02244139");
    });

    it("validates numeric length", () => {
        expect(() => {
            parsePassCodeString("0123");
        }).to.throw(/must be/);
    });

    it("validates key-based length", () => {
        expect(() => {
            parsePassCodeString("up up down down");
        }).to.throw(/must have length/);
    });
});
