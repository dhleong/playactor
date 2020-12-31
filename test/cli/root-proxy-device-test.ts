import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import {
    RootProxyDevice,
    RootProxiedError,
} from "../../src/cli/root-proxy-device";
import { RootMissingError } from "../../src/credentials/root-managing";

chai.use(chaiAsPromised);
chai.should();

describe("RootProxyDevice", () => {
    let device: RootProxyDevice;
    let proxiedInvocation: string[] | undefined;
    let invocationArgs: string[];

    beforeEach(() => {
        proxiedInvocation = undefined;
        invocationArgs = ["wake", "--ip=9001"];
        device = new RootProxyDevice(
            {
                async invoke(invocation) {
                    proxiedInvocation = invocation;
                },
            },
            {
                async discover() {
                    throw new RootMissingError();
                },
                async wake() {
                    throw new RootMissingError();
                },
                async openConnection() {
                    throw new RootMissingError();
                },
            },
            invocationArgs,
            42,
        );
    });

    async function invokeWithProxy() {
        await device.wake().should.eventually
            .be.rejectedWith(RootProxiedError);

        expect(proxiedInvocation).to.not.be.undefined;
        return proxiedInvocation!;
    }

    it("should add the current userID as an arg", async () => {
        (await invokeWithProxy()).should.deep.equal([
            "wake",
            "--ip=9001",
            "--proxied-user-id",
            "42",
        ]);
    });
});
