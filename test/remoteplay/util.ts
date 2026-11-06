import { IRemotePlayCredentials } from "../../src/credentials/model";
import { DeviceType, IDiscoveredDevice } from "../../src/discovery/model";

const REGISTRATION_KEY = "00112233445566778899aabbccddeeff";

export function fakeRemotePlayDevice(
    type: DeviceType = DeviceType.PS5,
    systemVersion?: string,
): IDiscoveredDevice {
    return {
        type,
        systemVersion: systemVersion ?? (
            type === DeviceType.PS5 ? "14100003" : "11000000"
        ),
        address: {
            address: "127.0.0.1",
            port: 9295,
            family: "IPv4",
        },
    } as IDiscoveredDevice;
}

export function fakeRemotePlayCredentials(
    type: DeviceType = DeviceType.PS5,
): IRemotePlayCredentials {
    const credentials: IRemotePlayCredentials = {
        "app-type": "r",
        "auth-type": "R",
        "client-type": "vr",
        "user-credential": "test",
        accountId: "test",
        registration: {
            "AP-Bssid": "test",
            "AP-Name": type,
            "RP-KeyType": "2",
            "RP-Key": REGISTRATION_KEY,
        },
    };

    if (type === DeviceType.PS5) {
        credentials.registration["PS5-RegistKey"] = REGISTRATION_KEY;
    } else {
        credentials.registration["PS4-RegistKey"] = REGISTRATION_KEY;
    }

    return credentials;
}
