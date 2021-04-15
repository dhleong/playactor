import {
    Command,
    command,
    ExpectedError,
    metadata,
    Printable,
} from "clime";

import { DeviceOptions } from "../options";
import { DeviceStatus } from "../../discovery/model";
import { ExitCode } from "../exit-codes";

class DeviceStatusSignal extends Error implements Printable {
    constructor(
        private readonly status: DeviceStatus | null,
    ) {
        super();
    }

    public print() {
        switch (this.status) {
            case null:
                process.exit(ExitCode.DeviceNotFound);
                break;

            case DeviceStatus.AWAKE:
                process.exit(ExitCode.DeviceAwake);
                break;

            case DeviceStatus.STANDBY:
                process.exit(ExitCode.DeviceStandby);
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
            if (e instanceof DeviceStatusSignal || e instanceof ExpectedError) {
                throw e;
            }

            options.logError(e);

            throw new DeviceStatusSignal(null);
        }
    }
}
