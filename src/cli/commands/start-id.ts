import { Command, command, param } from "clime";

import { DeviceOptions } from "../options";

@command({
    description: "Start an app or game by its Title ID",
})
export default class extends Command {
    /* eslint-disable @typescript-eslint/indent */
    public async execute(
        @param({
            required: true,
        })
        titleId: string,
        deviceSpec: DeviceOptions,
    ) {
        const device = await deviceSpec.findDevice();
        const connection = await device.openConnection();
        try {
            await connection.startTitleId(titleId);
        } finally {
            await connection.close();
        }
    }
}
