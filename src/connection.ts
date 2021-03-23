import { UnsupportedDeviceError } from "./connection/model";
import { SecondScreenDeviceConnection } from "./connection/secondscreen";
import { ICredentials } from "./credentials/model";
import { IConnectionConfig, IResolvedDevice } from "./device/model";
import { IDiscoveredDevice } from "./discovery/model";
import { openSocket } from "./socket/open";
import { Waker } from "./waker";

export async function openSecondScreen(
    waker: Waker,
    device: IResolvedDevice,
    discovered: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: ICredentials,
) {
    const socket = await openSocket(
        waker.networkFactory,
        discovered,
        creds,
        config.socket,
        config.network,
        config.login,
    );

    return new SecondScreenDeviceConnection(
        device.resolve.bind(device),
        socket,
    );
}

export function openConnection(
    waker: Waker,
    device: IResolvedDevice,
    discovered: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: ICredentials,
) {
    if (creds["auth-type"] === "R") {
        throw new UnsupportedDeviceError();
    } else {
        return openSecondScreen(waker, device, discovered, config, creds);
    }
}
