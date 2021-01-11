import * as chai from "chai";
import { fake } from "sinon";
import sinonChai from "sinon-chai";
import * as FakeTimers from "@sinonjs/fake-timers";

import { toArray } from "ix/asynciterable";
import { Discovery } from "../src/discovery";
import { MockDiscoveryNetworkFactory } from "./discovery/util";

chai.use(sinonChai);
chai.should();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ignore(v: any) {
    // nop
}

describe("Discovery", () => {
    let clock: FakeTimers.InstalledClock;
    let discovery: Discovery;
    let netFactory: MockDiscoveryNetworkFactory;

    beforeEach(() => {
        clock = FakeTimers.install();

        netFactory = new MockDiscoveryNetworkFactory();
        discovery = new Discovery({
            pingIntervalMillis: 5000,
            timeoutMillis: 30000,
        }, netFactory);
    });

    afterEach(() => {
        clock.uninstall();
    });

    describe(".discover()", () => {
        it("stops iterating on timeout", async () => {
            const state = { done: false };
            const promise = (async () => {
                for await (const device of discovery.discover()) {
                    ignore(device);
                }
                state.done = true;
            })();

            await clock.runAllAsync();
            await promise;
            state.done.should.be.true;
        });

        it("sends pings at appropriate intervals", async () => {
            const ping = fake();
            netFactory.network.ping = ping;

            const promise = toArray(discovery.discover());
            promise.then(() => {}); // ensure it starts running

            // we should start with a ping right away
            await clock.tickAsync(100);
            ping.should.have.been.calledOnce;

            // we've configured above for every 5s:
            await clock.tickAsync(4900);
            ping.should.have.been.calledTwice;

            clock.tickAsync(25000);
            await promise;
        });

        it("dedups devices by ID", async () => {
            netFactory.pendingDevices = [
                { id: "serenity" } as any,
                { id: "magellan" } as any,
                { id: "serenity" } as any,
            ];

            const promise = toArray(discovery.discover());
            promise.then(() => {}); // ensure it starts running
            clock.tickAsync(30000);
            const devices = await promise;

            devices.should.deep.equal([
                { id: "serenity" },
                { id: "magellan" },
            ]);
        });
    });
});
