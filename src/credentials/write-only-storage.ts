import { ICredentials, ICredentialStorage } from "./model";

/**
 * Write-only storage delegates to another [ICredentialStorage]
 * for writes, but only returns credentials from that storage
 * *after* it has written to them. This is useful if you want to
 * force authentication.
 */
export class WriteOnlyStorage implements ICredentialStorage {
    private hasWritten = false;

    constructor(
        private readonly delegate: ICredentialStorage,
    ) {}

    public async read(deviceId: string) {
        if (this.hasWritten) {
            return this.delegate.read(deviceId);
        }

        return null;
    }

    public async write(deviceId: string, credentials: ICredentials) {
        await this.delegate.write(deviceId, credentials);
        this.hasWritten = true;
    }
}
