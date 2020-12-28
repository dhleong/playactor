import * as chai from "chai";
import { expect } from "chai";

import { parseKeys } from "../../../src/cli/commands/send-keys";
import { RemoteOperation } from "../../../src/socket/remote";

chai.should();

describe("SendKeysCommand", () => {
    it("parses simple key names into ops", () => {
        parseKeys(["enter", "ps", "up"]).should.deep.equal([
            { key: RemoteOperation.Enter },
            { key: RemoteOperation.PS },
            { key: RemoteOperation.Up },
        ]);
    });

    it("ignores case on key name", () => {
        parseKeys(["EnTeR", "PS", "uP"]).should.deep.equal([
            { key: RemoteOperation.Enter },
            { key: RemoteOperation.PS },
            { key: RemoteOperation.Up },
        ]);
    });

    it("parses key names with hold times", () => {
        parseKeys(["enter:42", "ps:9001"]).should.deep.equal([
            { key: RemoteOperation.Enter, holdTimeMillis: 42 },
            { key: RemoteOperation.PS, holdTimeMillis: 9001 },
        ]);
    });

    it("rejects invalid times", () => {
        expect(() => {
            parseKeys(["enter:-42"]);
        }).to.throw();
    });
});
