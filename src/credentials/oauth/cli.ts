import open from "open";

import { IInputOutput } from "../../cli/io";
import { OauthStrategy } from "./model";

export class CliOauthStrategy implements OauthStrategy {
    constructor(
        private io: IInputOutput,
        private autoOpenUrls: boolean = true,
    ) {}

    public async performLogin(url: string): Promise<string> {
        if (this.autoOpenUrls) {
            this.io.logInfo("In a moment, we will attempt to open a browser window with the following URL:");
        } else {
            this.io.logInfo("Open the following URL in a web browser.");
        }
        this.io.logInfo(`  ${url}`);
        this.io.logInfo("Perform login there, then, when the page shows \"redirect\", copy the URL from your browser's address bar and paste it here.");

        if (this.autoOpenUrls) {
            await this.io.prompt("Hit ENTER to continue");
            await open(url);
        }

        return this.io.prompt("URL> ");
    }
}
