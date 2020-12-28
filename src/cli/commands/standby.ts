import { Command, command, metadata } from "clime";

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
        const connection = await device.openConnection();
        try {
            await connection.standby();
        } finally {
            await connection.close();
        }
    }
}
