import * as chai from "chai";
import * as FakeTimers from "@sinonjs/fake-timers";

import { Discovery } from "../src/discovery";
import { IDiscoveryNetwork } from "../src/discovery/model";

chai.should();

class MockNetwork implements IDiscoveryNetwork {
    close() {
        // nop
    }

    async ping(): Promise<void> {
        // nop
    }
}

describe("Discovery", () => {
    let clock: FakeTimers.InstalledClock;
    let discovery: Discovery;
    // let lastNetwork: IDiscoveryNetwork;

    beforeEach(() => {
        clock = FakeTimers.install();
        discovery = new Discovery({}, {
            create() {
                return /* lastNetwork = */ new MockNetwork();
            },
        });
    });

    afterEach(() => {
        clock.uninstall();
    });

    describe(".discover()", () => {
        it("stops iterating on timeout", async () => {
            const state = { done: false };
            const promise = (async () => {
                for await (const _ of discovery.discover()) {
                    // ignore
                }
                state.done = true;
            })();

            await clock.runAllAsync();
            await promise;
            state.done.should.be.true;
        });
    });
});
