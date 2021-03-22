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

export enum ErrorReason {
    FAILED,
    INVALID_PSN_ID,
    IN_USE,
    CRASH,
    RP_VERSION,
    UNKNOWN,
}

const errorCodes = {
    "80108b09": ErrorReason.FAILED,
    "80108b02": ErrorReason.INVALID_PSN_ID,
    "80108b10": ErrorReason.IN_USE,
    "80108b15": ErrorReason.CRASH,
    "80108b11": ErrorReason.RP_VERSION,
    "80108bff": ErrorReason.UNKNOWN,
};

export function errorReason(errorCode: string): ErrorReason {
    return (errorCodes as any)[errorCode.toLowerCase()] ?? ErrorReason.UNKNOWN;
}

const errorReasonStrings = {
    [ErrorReason.FAILED]: "Registration failed, probably invalid PIN",
    [ErrorReason.INVALID_PSN_ID]: "Invalid PSN ID",
    [ErrorReason.IN_USE]: "Remote is already in use",
    [ErrorReason.CRASH]: "Remote Play on Console crashed",
    [ErrorReason.RP_VERSION]: "RP-Version mismatch",
    [ErrorReason.UNKNOWN]: "Other Error",
};

export function errorReasonString(errorCode: string) {
    const reason = errorReason(errorCode);
    return errorReasonStrings[reason] ?? errorReasonStrings[ErrorReason.UNKNOWN];
}
