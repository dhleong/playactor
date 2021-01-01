import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import FakeTimers from "@sinonjs/fake-timers";

import { DeviceProtocolV1 } from "../../src/socket/protocol/v1";
import { TcpDeviceSocket } from "../../src/socket/tcp";
import { FakeDiscoveredDevice } from "./util";
import { FakeStream } from "./fake-stream";

chai.use(chaiAsPromised);
chai.should();

describe("TcpDeviceSocket", () => {
    let clock: FakeTimers.InstalledClock;
    let stream: FakeStream;
    let socket: TcpDeviceSocket;

    beforeEach(() => {
        clock = FakeTimers.install();
        socket = new TcpDeviceSocket(
            new FakeDiscoveredDevice(),
            DeviceProtocolV1,
            stream = new FakeStream(),
        );
    });

    afterEach(() => {
        clock.uninstall();
    });

    describe("requestKeepAlive", () => {
        it("causes a delay before disconnecting in close()", async () => {
            socket.requestKeepAlive(5000);

            // don't perform the polite disconnect until the keep alive
            const closePromise = socket.close();
            await clock.tickAsync(1000);
            stream.written.should.be.empty;

            // ... wait for it...
            await clock.tickAsync(3900);
            stream.written.should.be.empty;

            // now:
            await clock.tickAsync(100);
            stream.written.should.have.lengthOf(1);

            stream.emit("end");
            await closePromise.should.eventually.be.fulfilled;
        });

        it("doesn't add unnecessary delay to close()", async () => {
            // we've requested a keep alive, but did not then
            // immediately request to close()
            socket.requestKeepAlive(5000);
            await clock.tickAsync(5000);

            // the polite disconnect should have triggered immediately
            const closePromise = socket.close();
            await clock.tickAsync(0);
            stream.written.should.have.lengthOf(1);

            stream.emit("end");
            await closePromise.should.eventually.be.fulfilled;
        });
    });
});
