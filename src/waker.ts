import _debug from "debug";

import { CredentialManager } from "./credentials";
import { Discovery } from "./discovery";
import {
    DeviceStatus,
    IDiscoveredDevice,
    IDiscoveryConfig,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "./discovery/model";
import { StandardDiscoveryNetworkFactory } from "./discovery/standard";
import { formatDiscoveryMessage } from "./protocol";
import { redact } from "./util/redact";
import { IWakerNetworkFactory } from "./waker/model";
import { UdpWakerNetworkFactory } from "./waker/udp";

const debug = _debug("playactor:waker");

export enum WakeResult {
    ALREADY_AWAKE,
    SUCCESS,
}

export class Waker {
    constructor(
        public readonly credentials: CredentialManager,
        private readonly discoveryConfig: Partial<IDiscoveryConfig>,
        public readonly networkFactory: IWakerNetworkFactory =
        new UdpWakerNetworkFactory(),
        private readonly discoveryFactory: IDiscoveryNetworkFactory =
        StandardDiscoveryNetworkFactory,
    ) {}

    public async wake(
        device: IDiscoveredDevice,
        config: INetworkConfig = {},
    ) {
        if (device.status === DeviceStatus.AWAKE) {
            debug("device", redact(device), "is already awake");
            return WakeResult.ALREADY_AWAKE;
        }

        debug("loading credentials");
        const creds = await this.credentials.getForDevice(device);
        const network = this.networkFactory.create(config);

        try {
            // TODO perhaps we should retry this periodically?
            debug("sending WAKEUP");
            const message = formatDiscoveryMessage({
                data: creds as any,
                type: "WAKEUP",
                version: device.discoveryVersion,
            });
            debug("sending:", redact(message.toString("hex")));
            await network.sendTo(device, message);

            await this.deviceAwakened(device, config);

            return WakeResult.SUCCESS;
        } finally {
            network.close();
        }
    }

    private async deviceAwakened(
        device: IDiscoveredDevice,
        config: INetworkConfig,
    ) {
        const discovery = new Discovery(
            this.discoveryConfig,
            this.discoveryFactory,
        );

        debug("waiting for ", redact(device), "to become awake");
        for await (const d of discovery.discover(config, { uniqueDevices: false })) {
            if (d.id === device.id && d.status === DeviceStatus.AWAKE) {
                debug("received AWAKE status:", redact(d));
                return;
            }
        }

        throw new Error("Device didn't wake in time");
    }
}

export interface IWakerFactory {
    create(): Waker;
}

export class SimpleWakerFactory implements IWakerFactory {
    constructor(
        private readonly config: {
            credentials: CredentialManager,
            discoveryConfig: Partial<IDiscoveryConfig>,
            networkFactory: IWakerNetworkFactory,
            discoveryFactory: IDiscoveryNetworkFactory,
        },
    ) {}

    public create(): Waker {
        return new Waker(
            this.config.credentials,
            this.config.discoveryConfig,
            this.config.networkFactory,
            this.config.discoveryFactory,
        );
    }
}
