import * as chai from "chai";

import { DiscoveryVersions } from "../src/discovery/model";
import { formatDiscoveryMessage } from "../src/protocol";

chai.should();

describe("formatDiscoveryMessage", () => {
    it("appends the protocol marker to requests", () => {
        const message = formatDiscoveryMessage({
            type: "SRCH",
            version: DiscoveryVersions.PS4,
        });

        message.toString().should.equal(
            "SRCH * HTTP/1.1\n"
            + "device-discovery-protocol-version:00020020\n",
        );
    });

    it("sends response status lines as-is, like a real device", () => {
        const response = formatDiscoveryMessage({
            type: "HTTP/1.1 620 Server Standby",
            version: DiscoveryVersions.PS4,
            data: {
                "host-id": "serenity",
                "system-version": "13520001",
            },
        });

        response.toString().should.equal(
            "HTTP/1.1 620 Server Standby\n"
            + "host-id:serenity\n"
            + "system-version:13520001\n"
            + "device-discovery-protocol-version:00020020\n",
        );
    });

    it("omits keys that are not part of the discovery protocol", () => {
        const message = formatDiscoveryMessage({
            type: "SRCH",
            version: DiscoveryVersions.PS4,
            data: {
                "host-id": "serenity",
                kaylee: "shiny",
            },
        });

        message.toString().should.equal(
            "SRCH * HTTP/1.1\n"
            + "host-id:serenity\n"
            + "device-discovery-protocol-version:00020020\n",
        );
    });
});
