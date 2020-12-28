import { Command, command, metadata } from "clime";

import { DeviceOptions } from "../options";

@command({
    description: "Wake up the device",
})
export default class extends Command {
    @metadata
    public async execute(
        deviceSpec: DeviceOptions,
    ) {
        const device = await deviceSpec.findDevice();
        await device.wake();
    }
}
