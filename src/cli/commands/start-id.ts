import {
    Command,
    command,
    option,
    param,
} from "clime";

import { DeviceOptions } from "../options";

class StartTitleOptions extends DeviceOptions {
    @option({
        name: "no-auto-quit",
        description: "Don't quit an already running app",
        toggle: true,
    })
    public dontAutoQuit = false;
}

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
        deviceSpec: StartTitleOptions,
    ) {
        const device = await deviceSpec.findDevice();
        const connection = await device.openConnection(deviceSpec.connectionConfig);
        try {
            if (!connection.startTitleId) {
                throw new Error("start-id not supported for this device");
            }

            await connection.startTitleId(titleId, {
                autoQuitExisting: !deviceSpec.dontAutoQuit,
            });
        } finally {
            await connection.close();
        }
    }
}
