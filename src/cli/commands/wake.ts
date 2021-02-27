import _debug from "debug";

import { Command, command, metadata } from "clime";

import { DeviceOptions } from "../options";

const debug = _debug("playground:commands:wake");

@command({
    description: "Wake up the device",
})
export default class extends Command {
    @metadata
    public async execute(
        deviceSpec: DeviceOptions,
    ) {
        const device = await deviceSpec.findDevice();
        debug("found device; sending wake:", device);
        await device.wake();
    }
}
