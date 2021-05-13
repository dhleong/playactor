import {
    Command,
    command,
    metadata,
    option,
    Options,
    Shim,
} from "clime";

import { cli } from "../clime";

export class DefaultOptions extends Options {
    @option({
        name: "version",
        description: "Show version information",
        toggle: true,
    })
    public showVersion = false;
}

@command()
export default class extends Command {
    @metadata
    public async execute(options: DefaultOptions) {
        /* eslint-disable no-console */
        if (options.showVersion) {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { version } = require("../../../package.json");
            console.log(`playactor v${version}`);
            return;
        }

        // Default to showing the normal help information.
        const shim = new Shim(cli);
        await shim.execute(["node", "playactor-cli.js", "--help"]);
        /* eslint-enable no-console */
    }
}
