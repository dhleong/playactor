import * as chai from "chai";
import { remotePlayRequestError } from "../../src/remoteplay/protocol";

chai.should();

describe("remotePlayRequestError", () => {
    it("includes the request method and path", () => {
        const error = remotePlayRequestError(
            "http://192.168.1.50:9295/sie/ps5/rp/sess/init",
            "GET",
            403,
            "Forbidden",
        );

        error.message.should.equal(
            "Remote Play request failed: GET /sie/ps5/rp/sess/init"
            + ": 403: Forbidden",
        );
    });

    it("includes the application reason when provided", () => {
        const error = remotePlayRequestError(
            "http://192.168.1.50:9295/sie/ps5/rp/sess/rgst",
            "POST",
            403,
            "Forbidden",
            "80108b11",
        );

        error.message.should.equal(
            "Remote Play request failed: POST /sie/ps5/rp/sess/rgst"
            + ": 403: Forbidden: 80108b11 (RP-Version mismatch)",
        );
    });
});
