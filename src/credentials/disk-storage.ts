import fs from "fs-extra";
import { homedir } from "os";
import { join as joinPath } from "path";

import { ICredentials, ICredentialStorage } from "./model";

export function determineDefaultFile() {
    return joinPath(homedir(), ".config", "playground", "credentials.json");
}

export class DiskCredentialsStorage implements ICredentialStorage {
    public readonly filePath: string;

    constructor(
        filePath?: string,
    ) {
        this.filePath = filePath ?? determineDefaultFile();
    }

    public async read(deviceId: string): Promise<ICredentials | null> {
        const json = await this.readCredentialsMap();
        return json[deviceId] ?? null;
    }

    public async write(
        deviceId: string,
        credentials: ICredentials,
    ) {
        // NOTE: this is not perfectly safe, but should be *mostly* okay...
        // if we run into a situation where concurrency is an issue, we can
        // set up locks
        const json = await this.readCredentialsMap();
        json[deviceId] = credentials;

        await fs.writeFile(this.filePath, JSON.stringify(json));
    }

    private async readCredentialsMap() {
        let contents: Buffer;
        try {
            contents = await fs.readFile(this.filePath);
        } catch (e) {
            return {};
        }

        return JSON.parse(contents.toString()) as {[key: string]: ICredentials};
    }
}
