import * as chai from "chai";
import chaiSubset from "chai-subset";

import { MimCredentialRequester } from "../../src/credentials/mim-requester";
import {
    DeviceStatus,
    DeviceType,
    DiscoveryMessageType,
    DiscoveryVersions,
    IDeviceAddress,
    IDiscoveredDevice,
} from "../../src/discovery/model";
import { MockDiscoveryNetworkFactory } from "../discovery/util";

chai.use(chaiSubset);
chai.should();

const device: IDiscoveredDevice = {
    address: {
        address: "192.168.1.37",
        family: "IPv4",
        port: 987,
    },
    hostRequestPort: 997,
    extras: {},
    discoveryVersion: DiscoveryVersions.PS4,
    systemVersion: "13520001",
    id: "serenity",
    name: "PS4-028",
    status: DeviceStatus.AWAKE,
    type: DeviceType.PS4,
};

const appSender: IDeviceAddress = {
    address: "192.168.1.20",
    family: "IPv4",
    port: 52301,
};

describe("MimCredentialRequester", () => {
    let netFactory: MockDiscoveryNetworkFactory;
    let requester: MimCredentialRequester;

    beforeEach(() => {
        netFactory = new MockDiscoveryNetworkFactory();
        requester = new MimCredentialRequester(netFactory, {});
    });

    it("responds to SRCH exactly like a real device", async () => {
        const sent = new Promise<[string, number, Buffer]>(resolve => {
            netFactory.network.sendBuffer = async (...args) => resolve(args);
        });

        requester.requestForDevice(device);
        netFactory.onMessage!({
            type: DiscoveryMessageType.SRCH,
            sender: appSender,
            version: DiscoveryVersions.PS4,
            data: {},
        });

        const [address, port, response] = await sent;
        address.should.equal(appSender.address);
        port.should.equal(appSender.port);
        response.toString().should.equal(
            "HTTP/1.1 620 Server Standby\n"
            + "host-id:1234567890AB\n"
            + "host-name:PlayActor\n"
            + "host-request-port:997\n"
            + "host-type:PS4\n"
            + "system-version:13520001\n"
            + "device-discovery-protocol-version:00020020\n",
        );
    });

    it("resolves with the credentials received via WAKEUP", async () => {
        const promise = requester.requestForDevice(device);

        netFactory.onMessage!({
            type: DiscoveryMessageType.WAKEUP,
            sender: appSender,
            version: DiscoveryVersions.PS4,
            data: { "user-credential": "shiny" },
        });

        const credentials = await promise;
        credentials.should.containSubset({ "user-credential": "shiny" });
    });
});
