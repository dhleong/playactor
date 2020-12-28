import debug from "debug";
import {
    Options,
    option,
} from "clime";

import { CredentialManager } from "../credentials";
import { PendingDevice } from "../device/pending";
import { IDiscoveredDevice, IDiscoveryConfig, INetworkConfig } from "../discovery/model";
import { StandardDiscoveryNetworkFactory } from "../discovery/standard";

export class LoggingOptions extends Options {
    @option({
        name: "debug",
        description: "Enable debug logging",
        toggle: true,
    })
    public enableDebug = false;

    public async configureLogging() {
        if (this.enableDebug) {
            debug.enable("playground:*");
        }
    }
}

export class DeviceOptions extends LoggingOptions {
    @option({
        name: "ip",
        description: "Select a specific device by IP",
    })
    public deviceIp?: string;

    @option({
        name: "timeout",
        description: "How long to wait before deciding the device cannot be found (milliseconds)",
    })
    public deviceTimeout?: number;

    public async findDevice() {
        this.configureLogging();

        let description = "any device";
        let predicate: (device: IDiscoveredDevice) => boolean = () => true;

        if (this.deviceIp) {
            description = `device at ${this.deviceIp}`;
            predicate = device => device.address.address === this.deviceIp;
        }

        // TODO other selection mechanisms

        const networkConfig: INetworkConfig = {
            // TODO
        };

        const discoveryConfig: Partial<IDiscoveryConfig> = {
            timeoutMillis: this.deviceTimeout,
        };

        // TODO dummy support
        const credentials = new CredentialManager();

        const device = new PendingDevice(
            description,
            predicate,
            networkConfig,
            discoveryConfig,
            StandardDiscoveryNetworkFactory,
            credentials,
        );
        await device.discover();

        // if we got here, the device was found!
        return device;
    }
}
