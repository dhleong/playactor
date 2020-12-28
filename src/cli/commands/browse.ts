import {
    Command,
    command,
    metadata,
} from "clime";

import { DiscoveryOptions } from "../options";
import { Discovery } from "../../discovery";

@command({
    brief: "Browse for device on the network",
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
