import { Command, command, param } from "clime";
import { delayMillis } from "../../util/async";

import { DeviceOptions } from "../options";

@command({
    brief: "Submit the on-screen keyboard",
    description: `
Submit the on-screen keyboard, optionally providing text to fill
the input field with.
    `.trim(),
})
export default class extends Command {
    public async execute(
        @param({
            description: "Text with which to replace any existing input",
            name: "text",
        })
        text: string | undefined = undefined,
        deviceSpec: DeviceOptions,
    ) {
        const device = await deviceSpec.findDevice();
        const connection = await device.openConnection();
        try {
            const osk = await connection.openKeyboard();

            if (text) {
                await osk.setText(text);
            }

            await osk.submit();

            // give the device some time to process before we disconnect
            // TODO: this is probably best handled internally, by having
            // the submit() task give the connection a deadline to await
            // before closing...
            await delayMillis(450);
        } finally {
            await connection.close();
        }
    }
}
