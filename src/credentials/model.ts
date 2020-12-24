import { IDiscoveredDevice } from "../discovery/model";

export interface ICredentials {
    "app-type"?: "r";
    "auth-type": "C" | "R";
    "client-type": "a" | "i" | "vr";
    "model"?: "m";
    "user-credential": string;
}

export interface ICredentialStorage {
    read(deviceSerial: string): Promise<ICredentials | null>;
    write(deviceSerial: string, credentials: ICredentials): Promise<void>;
}

export interface ICredentialRequester {
    requestForDevice(device: IDiscoveredDevice): Promise<ICredentials>;
}
