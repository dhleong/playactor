import _debug from "debug";

import { IDiscoveredDevice } from "../discovery/model";
import { ICredentialRequester, ICredentials } from "./model";

const debug = _debug("playground:credentials:root");

export class RootMissingError extends Error {
}

/**
 * The RootManagingCredentialRequester wraps another ICredentialRequester
 * and ensures that root access is available before delegating to that
 * requester, and relinquishes root access afterward by setting the
 * process UID to the provided `restoreUserId`.
 */
export class RootManagingCredentialRequester implements ICredentialRequester {
    constructor(
        private readonly delegate: ICredentialRequester,
        private readonly restoreUserId: number,
    ) {}

    public async requestForDevice(device: IDiscoveredDevice): Promise<ICredentials> {
        if (process.getuid && process.getuid()) {
            throw new RootMissingError("Root permissions required to request credentials");
        }

        const result = await this.delegate.requestForDevice(device);

        if (process.setuid) {
            process.setuid(this.restoreUserId);
            debug("Restored user ID to:", this.restoreUserId);
        }

        return result;
    }
}
