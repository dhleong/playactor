import * as chai from "chai";
import sinonChai from "sinon-chai";
import * as FakeTimers from "@sinonjs/fake-timers";

import { MockDiscoveryNetworkFactory } from "./discovery/util";
import { DeviceStatus, IDiscoveredDevice } from "../src/discovery/model";
import { Waker } from "../src/waker";
import { CredentialManager } from "../src/credentials";
import { RejectingCredentialRequester } from "../src/credentials/rejecting-requester";
import { IWakerNetwork, IWakerNetworkFactory } from "../src/waker/model";

chai.use(sinonChai);
chai.should();

function device(id: string, status: DeviceStatus): IDiscoveredDevice {
    return {
        id,
        status,
    } as any;
}

class FakeWakerNetwork implements IWakerNetwork {
    public close() {
        // nop
    }

    public async sendTo(/* device: IDiscoveredDevice, message: Buffer */): Promise<void> {
        // record?
    }
}

class FakeWakerNetworkFactory implements IWakerNetworkFactory {
    public create(): IWakerNetwork {
        return new FakeWakerNetwork();
    }
}

describe("Waker", () => {
    let clock: FakeTimers.InstalledClock;
    let netFactory: MockDiscoveryNetworkFactory;
    let waker: Waker;

    beforeEach(() => {
        clock = FakeTimers.install();
        netFactory = new MockDiscoveryNetworkFactory();

        waker = new Waker(
            new CredentialManager(
                new RejectingCredentialRequester(),
                {
                    async read() {
                        return { } as any;
                    },
                    async write() {
                        // nop
                    },
                },
            ),
            {},
            new FakeWakerNetworkFactory(),
            netFactory,
        );
    });

    afterEach(() => {
        clock.uninstall();
    });

    it("doesn't timeout detecting awakening", async () => {
        netFactory.pendingDevices = [
            device("serenity", DeviceStatus.STANDBY),
            device("serenity", DeviceStatus.AWAKE),
        ];

        await waker.wake(device("serenity", DeviceStatus.STANDBY));
    });
});
