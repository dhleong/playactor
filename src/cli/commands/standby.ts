import { Command, command, metadata } from "clime";
import { DeviceStatus } from "../../discovery/model";

import { DeviceOptions } from "../options";

@command({
    description: "Request the device enter standby/rest mode",
})
export default class extends Command {
    @metadata
    public async execute(
        deviceSpec: DeviceOptions,
    ) {
        const device = await deviceSpec.findDevice();
        const desc = await device.discover();
        if (desc.status === DeviceStatus.STANDBY) {
            deviceSpec.logResult("The device is already in standby");
            return;
        }

        const connection = await device.openConnection();
        try {
            await connection.standby();
        } finally {
            await connection.close();
        }
    }
}
