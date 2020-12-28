import {
    Command,
    command,
    metadata,
    Printable,
} from "clime";

import { DeviceOptions } from "../options";
import { DeviceStatus } from "../../discovery/model";

class DeviceStatusSignal extends Error implements Printable {
    constructor(
        private readonly status: DeviceStatus | null,
    ) {
        super();
    }

    public print() {
        switch (this.status) {
            case null:
                process.exit(2);
                break;

            case DeviceStatus.AWAKE:
                process.exit(0);
                break;

            case DeviceStatus.STANDBY:
                process.exit(1);
                break;
        }
    }
}

@command({
    brief: "Detect a device and its state on the network",
    description: `
Detect a device and its state on the network. If found, information
about it will be printed to the console.

In addition, the status of the device can be determined by the exit code
of this process:

    0 - The device was found and is awake
    1 - The device was found and it is in standby
    2 - The device was not found
    `.trim(),
})
export default class extends Command {
    @metadata
    public async execute(
        options: DeviceOptions,
    ) {
        try {
            const device = await options.findDevice();
            const info = await device.discover();
            options.logResult(info);
            throw new DeviceStatusSignal(info.status);
        } catch (e) {
            if (e instanceof DeviceStatusSignal) {
                throw e;
            }

            options.logError(e);

            throw new DeviceStatusSignal(null);
        }
    }
}
