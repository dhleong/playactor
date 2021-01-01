import { Command, command, param } from "clime";

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
        const connection = await device.openConnection(deviceSpec.connectionConfig);
        try {
            const osk = await connection.openKeyboard();

            if (text) {
                await osk.setText(text);
            }

            await osk.submit();
        } finally {
            await connection.close();
        }
    }
}
