import { DiskCredentialsStorage } from "./credentials/disk-storage";
import {
    ICredentialRequester,
    ICredentialStorage,
} from "./credentials/model";
import { RejectingCredentialRequester } from "./credentials/rejecting-requester";
import { IDiscoveredDevice } from "./discovery/model";

export class CredentialManager {
    constructor(
        private readonly storage: ICredentialStorage = new DiskCredentialsStorage(),
        private readonly requester: ICredentialRequester = RejectingCredentialRequester,
    ) {}

    public async getForDevice(device: IDiscoveredDevice) {
        const existing = await this.storage.read(device.id);
        if (existing) return existing;

        const fromRequest = await this.requester.requestForDevice(device);
        await this.storage.write(device.id, fromRequest);
        return fromRequest;
    }
}
