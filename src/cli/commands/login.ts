import { Command, command, metadata } from "clime";

import { DeviceOptions } from "../options";

@command({
    description: "Login to the device",
})
export default class extends Command {
    @metadata
    public async execute(
        deviceSpec: DeviceOptions,
    ) {
        const device = await deviceSpec.findDevice();
        // TODO clear credentials?
        const conn = await device.openConnection();
        await conn.close();
    }
}
