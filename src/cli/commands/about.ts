import chalk from "chalk";
import {
    Command,
    command,
    metadata,
} from "clime";
import got from "got";

import { InputOutputOptions } from "../options";

export function getAppVersion() {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { version } = require("../../../package.json");

    return version;
}

const API_BASE = "https://api.github.com";
const REPO_BASE = `${API_BASE}/repos/dhleong/playactor`;
const RELEASE_API_ENDPOINT = `${REPO_BASE}/releases/latest`;

interface GithubReleaseObject {
    name: string;
    body: string;
}

interface UI {
    upToDate(io: InputOutputOptions, current: string, release: GithubReleaseObject): void;
    outdated(io: InputOutputOptions, current: string, release: GithubReleaseObject): void;
    unknown(io: InputOutputOptions, current: string, e: Error): void;
}

class MachineUI implements UI {
    public upToDate(io: InputOutputOptions, current: string, release: GithubReleaseObject): void {
        io.logResult({ current, latest: release.name, isLatest: true });
    }
    public outdated(io: InputOutputOptions, current: string, release: GithubReleaseObject): void {
        io.logResult({ current, latest: release.name, isLatest: false });
    }
    public unknown(io: InputOutputOptions, current: string): void {
        io.logResult({ current });
    }
}

class RichUI implements UI {
    public upToDate(io: InputOutputOptions, current: string) {
        io.logResult(chalk`playactor v{underline ${current}} ({bold.greenBright latest})`);
    }

    public outdated(io: InputOutputOptions, current: string, release: GithubReleaseObject) {
        io.logResult(chalk`playactor v{underline ${current}} ({bold.redBright outdated})`);
        io.logResult(chalk`Latest version: v{greenBright ${release.name}}:`);
        io.logResult(chalk`To update, run: {underline npm i -g playactor}`);
        io.logResult("");
        io.logResult(chalk`{bold Notes From Latest Release}:`);
        io.logResult(release.body);
    }

    public unknown(io: InputOutputOptions, current: string, e: Error): void {
        io.logResult(chalk`
            playactor v${current} ({magenta failed to check for updates})
        `.trim());
        if (io.enableDebug) {
            io.logError(e);
        } else {
            io.logError(e.message);
        }
    }
}

@command({
    brief: "Check for playactor updates, etc.",
})
export default class extends Command {
    @metadata
    public async execute(
        io: InputOutputOptions,
    ) {
        const current = getAppVersion();
        const ui = io.machineFriendly ? new MachineUI() : new RichUI();

        try {
            const data: GithubReleaseObject = await got(RELEASE_API_ENDPOINT).json();
            const isLatest = data.name === current;
            if (isLatest) {
                ui.upToDate(io, current, data);
            } else {
                ui.outdated(io, current, data);
            }
        } catch (e) {
            ui.unknown(io, current, e);
        }
    }
}
