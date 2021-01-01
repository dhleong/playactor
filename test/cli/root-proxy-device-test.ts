import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import {
    RootProxyDevice,
    RootProxiedError,
    IRootProxyConfig,
} from "../../src/cli/root-proxy-device";
import { RootMissingError } from "../../src/credentials/root-managing";

import { FakeIO } from "./fake-io";

chai.use(chaiAsPromised);
chai.should();

describe("RootProxyDevice", () => {
    let device: RootProxyDevice;
    let proxiedInvocation: string[] | undefined;
    let config: IRootProxyConfig;

    beforeEach(() => {
        proxiedInvocation = undefined;
        config = {
            currentUserId: 42,
            effectiveCredentialsPath: "/serenity/secrets/creds.json",
            invocationArgs: ["wake", "--ip=9001"],
        };
        device = new RootProxyDevice(
            new FakeIO(),
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
            config,
            path => `/RESOLVED/${path}`,
        );
    });

    async function invokeWithProxy() {
        await device.wake().should.eventually
            .be.rejectedWith(RootProxiedError);

        expect(proxiedInvocation).to.not.be.undefined;
        return proxiedInvocation!;
    }

    it("adds the current userID and credentials as args", async () => {
        (await invokeWithProxy()).should.deep.equal([
            "wake",
            "--ip=9001",
            "--credentials", "/serenity/secrets/creds.json",
            "--proxied-user-id",
            "42",
        ]);
    });

    it("resolves provided credentials paths", async () => {
        const provided = "~mreynolds/creds.json";
        config.invocationArgs.push("-c", provided);
        config.providedCredentialsPath = provided;

        (await invokeWithProxy()).should.deep.equal([
            "wake",
            "--ip=9001",
            "-c", "/RESOLVED/~mreynolds/creds.json",
            "--proxied-user-id",
            "42",
        ]);
    });
});
