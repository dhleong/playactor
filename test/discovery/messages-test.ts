import * as chai from "chai";
import chaiSubset from "chai-subset";

import { parseMessage } from "../../src/discovery/messages";
import { DeviceStatus } from "../../src/discovery/model";

chai.use(chaiSubset);
chai.should();

describe("discovery.parseMessage", () => {
    it("handles device announcements", () => {
        const m = Buffer.from(`
HTTP/1.1 620 Server Standby
        `.trim());

        parseMessage(m).should.containSubset({
            type: "DEVICE",
            status: DeviceStatus.STANDBY,
        });
    });

    it("handles requests", () => {
        const m = Buffer.from(`
SRCH * HTTP/1.1
        `.trim());

        parseMessage(m).should.containSubset({
            type: "SRCH",
        });
    });

    it("includes and normalizes extra 'header' data", () => {
        const m = Buffer.from(`
WAKEUP * HTTP/1.1
Host-Id: serenity
Auth-Type: C
        `.trim());

        parseMessage(m).should.containSubset({
            type: "WAKEUP",

            "auth-type": "C",
            "host-id": "serenity",
        });
    });
});
