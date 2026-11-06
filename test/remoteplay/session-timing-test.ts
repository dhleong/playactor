import * as chai from "chai";
import net from "net";
import sinon from "sinon";

import * as protocol from "../../src/remoteplay/protocol";
import { openSession } from "../../src/remoteplay/session";
import * as asyncUtil from "../../src/util/async";
import { fakeRemotePlayCredentials, fakeRemotePlayDevice } from "./util";

describe("RemotePlay session connection timing", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("waits 200ms after session initialisation before connecting", async () => {
        const device = fakeRemotePlayDevice();
        const credentials = fakeRemotePlayCredentials();

        const request = sinon.stub(protocol, "request").resolves({
            headers: {
                "rp-nonce": Buffer.alloc(16, 0x42).toString("base64"),
            },
        } as any);

        // Hold the simulated delay until the test releases it.
        let signalDelayStarted: () => void = () => {};
        const delayStarted = new Promise<void>(resolve => {
            signalDelayStarted = resolve;
        });

        let releaseDelay: () => void = () => {};
        const delayBarrier = new Promise<void>(resolve => {
            releaseDelay = resolve;
        });

        const delay = sinon.stub(asyncUtil, "delayMillis")
            .callsFake(() => {
                signalDelayStarted();
                return delayBarrier;
            });

        const simulatedError = new Error("Simulated TCP connection");

        const connect = sinon.stub(net, "createConnection")
            .throws(simulatedError);

        const outcome = openSession(device, {}, credentials).then(
            () => undefined,
            (error: unknown) => error,
        );

        // Session initialisation must complete first.
        await delayStarted;

        chai.expect(request.calledOnce).to.equal(true);
        chai.expect(delay.calledOnceWithExactly(200)).to.equal(true);

        // The TCP connection must not begin during the delay.
        chai.expect(connect.notCalled).to.equal(true);

        // Releasing the delay permits the TCP connection.
        releaseDelay();

        chai.expect(await outcome).to.equal(simulatedError);
        chai.expect(connect.calledOnce).to.equal(true);
    });
});
