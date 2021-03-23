import { IDiscoveredDevice } from "../discovery/model";
import { IDeviceRegistration } from "../remoteplay/registration";

export interface ISecondScreenCredentials {
    "app-type": "c";
    "auth-type": "C"
    "client-type": "a" | "i";
    "model"?: "m" | "w";
    "user-credential": string;
}

export interface IRemotePlayCredentials {
    "app-type": "r";
    "auth-type": "R";
    "client-type": "vr";
    "model"?: "m" | "w";
    "user-credential": string;

    accountId: string;
    registration: IDeviceRegistration;
}

export type ICredentials = ISecondScreenCredentials | IRemotePlayCredentials;

export interface ICredentialStorage {
    read(deviceId: string): Promise<ICredentials | null>;
    write(deviceId: string, credentials: ICredentials): Promise<void>;
}

export interface ICredentialRequester {
    requestForDevice(device: IDiscoveredDevice): Promise<ICredentials>;
}
