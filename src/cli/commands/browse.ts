import {
    Command,
    command,
    metadata,
} from "clime";

import { DiscoveryOptions } from "../options";
import { Discovery } from "../../discovery";

@command({
    description: "Browse for device on the network, printing information about each one",
})
export default class extends Command {
    @metadata
    public async execute(
        options: DiscoveryOptions,
    ) {
        const discovery = new Discovery(
            options.discoveryConfig,
        );

        for await (const device of discovery.discover()) {
            options.logResult(device);
        }
    }
}
