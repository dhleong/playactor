import * as chai from "chai";

import { parseControlResponse } from "../../src/remoteplay/control-response";

describe("parseControlResponse", () => {
    const responseHeaders = "HTTP/1.1 200 OK\r\n"
        + "RP-Server-Type: AQIDBA==\r\n\r\n";

    it("parses a complete HTTP response", () => {
        const result = parseControlResponse(
            Buffer.from(responseHeaders),
        );

        chai.expect(result).to.deep.equal({
            encryptedServerType: "AQIDBA==",
            remainingData: Buffer.alloc(0),
        });
    });

    it("waits for all HTTP headers to arrive", () => {
        const first = Buffer.from("HTTP/1.1 200 OK\r\nRP-Server");
        const second = Buffer.from("-Type: AQIDBA==\r\n\r");
        const third = Buffer.from("\n");

        chai.expect(parseControlResponse(first)).to.equal(undefined);

        const partial = Buffer.concat([first, second]);
        chai.expect(parseControlResponse(partial)).to.equal(undefined);

        const complete = Buffer.concat([partial, third]);
        chai.expect(parseControlResponse(complete)).to.deep.equal({
            encryptedServerType: "AQIDBA==",
            remainingData: Buffer.alloc(0),
        });
    });

    it("preserves binary data following the HTTP headers", () => {
        const binary = Buffer.from([
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x05, 0x00, 0x00,
        ]);

        const received = Buffer.concat([
            Buffer.from(responseHeaders),
            binary,
        ]);

        chai.expect(parseControlResponse(received)).to.deep.equal({
            encryptedServerType: "AQIDBA==",
            remainingData: binary,
        });
    });

    it("handles HTTP header names case-insensitively", () => {
        const received = Buffer.from(
            "HTTP/1.1 200 OK\r\n"
            + "rP-sErVeR-tYpE: AQIDBA==\r\n\r\n",
        );

        chai.expect(parseControlResponse(received)).to.deep.equal({
            encryptedServerType: "AQIDBA==",
            remainingData: Buffer.alloc(0),
        });
    });

    it("rejects HTTP errors with the application reason", () => {
        const received = Buffer.from(
            "HTTP/1.1 403 Forbidden\r\n"
            + "RP-Application-Reason: 80108b02\r\n\r\n",
        );

        chai.expect(() => parseControlResponse(received))
            .to.throw("Remote Play session control HTTP 403 (RP reason: 80108b02)");
    });

    it("rejects invalid HTTP status lines", () => {
        const received = Buffer.from(
            "INVALID RESPONSE\r\nRP-Server-Type: AQIDBA==\r\n\r\n",
        );

        chai.expect(() => parseControlResponse(received))
            .to.throw("Invalid Remote Play session control response");
    });

    it("rejects responses without RP-Server-Type", () => {
        const received = Buffer.from(
            "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n",
        );

        chai.expect(() => parseControlResponse(received))
            .to.throw("Missing Remote Play session control RP-Server-Type header");
    });

    it("rejects oversized incomplete HTTP headers", () => {
        const received = Buffer.alloc(64 * 1024 + 1, 0x41);

        chai.expect(() => parseControlResponse(received))
            .to.throw("Remote Play session control HTTP headers are too large");
    });

    it("rejects oversized complete HTTP headers", () => {
        const received = Buffer.concat([
            Buffer.from("HTTP/1.1 200 OK\r\nX-Long: "),
            Buffer.alloc(64 * 1024, 0x41),
            Buffer.from("\r\nRP-Server-Type: AQIDBA==\r\n\r\n"),
        ]);

        chai.expect(() => parseControlResponse(received))
            .to.throw("Remote Play session control HTTP headers are too large");
    });
});
