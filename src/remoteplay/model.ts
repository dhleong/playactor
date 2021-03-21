import { DeviceType, IDiscoveredDevice } from "../discovery/model";

export enum RemotePlayVersion {
    PS4_8,
    PS4_9,
    PS4_10,
    PS5_1,
}

export function remotePlayVersionFor(device: IDiscoveredDevice) {
    if (device.type === DeviceType.PS5) {
        return RemotePlayVersion.PS5_1;
    }

    const versionInt = parseInt(device.systemVersion, 10);
    if (versionInt >= 8000000) {
        return RemotePlayVersion.PS4_10;
    }

    if (versionInt >= 7000000) {
        return RemotePlayVersion.PS4_9;
    }

    return RemotePlayVersion.PS4_8;
}

export function remotePlayVersionToString(version: RemotePlayVersion) {
    switch (version) {
        case RemotePlayVersion.PS4_8: return "8.0";
        case RemotePlayVersion.PS4_9: return "9.0";
        case RemotePlayVersion.PS4_10: return "10.0";
        case RemotePlayVersion.PS5_1: return "1.0";
    }
}
