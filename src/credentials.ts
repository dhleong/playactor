import { DiskCredentialsStorage } from "./credentials/disk-storage";
import {
    ICredentialRequester,
    ICredentialStorage,
} from "./credentials/model";
import { RejectingCredentialRequester } from "./credentials/rejecting-requester";
import { /* DeviceStatus, */ IDiscoveredDevice } from "./discovery/model";

export class CredentialsError extends Error {
}

export class CredentialManager {
    constructor(
        private readonly requester: ICredentialRequester = new RejectingCredentialRequester(),
        private readonly storage: ICredentialStorage = new DiskCredentialsStorage(),
    ) {}

    public async getForDevice(device: IDiscoveredDevice) {
        const existing = await this.storage.read(device.id);
        if (existing) return existing;

        // if (device.status !== DeviceStatus.AWAKE) {
        //     throw new CredentialsError(`Device ${device.name} must
        //     be awake for initial registration`);
        // }

        const fromRequest = await this.requester.requestForDevice(device);
        await this.storage.write(device.id, fromRequest);
        return fromRequest;
    }
}
