import {
    Options,
    option,
} from "clime";
import { CredentialManager } from "../credentials";

import { PendingDevice } from "../device/pending";
import { IDiscoveredDevice } from "../discovery/model";
import { StandardDiscoveryNetworkFactory } from "../discovery/standard";

export class LoggingOptions extends Options {
    @option({
        flag: "v",
        description: "Output verbose logging",
        toggle: true,
    })
    public verbose = false;
}

export class DeviceOptions extends LoggingOptions {
    @option({
        name: "ip",
        description: "Select a specific device by IP",
    })
    public deviceIp?: string;

    public async findDevice() {
        let description = "any device";
        let predicate: (device: IDiscoveredDevice) => boolean = () => true;

        if (this.deviceIp) {
            description = `device at ${this.deviceIp}`;
            predicate = device => device.address.address === this.deviceIp;
        }

        // TODO other selection mechanisms, network options, etc.

        // TODO dummy support
        const credentials = new CredentialManager();

        const device = new PendingDevice(
            description,
            predicate,
            {}, {},
            StandardDiscoveryNetworkFactory,
            credentials,
        );
        await device.discover();

        // if we got here, the device was found!
        return device;
    }
}
