import _debug from "debug";
import { IRemotePlayCredentials } from "../credentials/model";
import { IConnectionConfig } from "../device/model";
import { IDiscoveredDevice } from "../discovery/model";

const debug = _debug("playactor:remoteplay:session");

export enum RemotePlayCommand {
    STANDBY = 0x50,
}

export class RemotePlaySession {
    constructor(
        // FIXME: these probably are only public to satisfy typescript
        public readonly discovered: IDiscoveredDevice,
        public readonly config: IConnectionConfig,
        public readonly creds: IRemotePlayCredentials,
    ) {}

    public async sendCommand(command: RemotePlayCommand) {
        debug("TODO: send", command);
    }
}

export async function openSession(
    discovered: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: IRemotePlayCredentials,
) {
    return new RemotePlaySession(
        discovered,
        config,
        creds,
    );
}
