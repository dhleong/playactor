import { Command, command, metadata } from "clime";
import { DeviceType } from "../../discovery/model";
import { UnsupportedDeviceError } from "../../socket/open";

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
        try {
            const conn = await device.openConnection();
            await conn.close();
        } catch (e) {
            if (e instanceof UnsupportedDeviceError) {
                const info = await device.discover();
                if (info.type === DeviceType.PS5) {
                    deviceSpec.logInfo("Registered with device successfully. The wake command should work now!");
                } else {
                    throw e;
                }
            }
        }
    }
}
