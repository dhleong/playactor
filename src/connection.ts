import { RemotePlayDeviceConnection } from "./connection/remoteplay";
import { SecondScreenDeviceConnection } from "./connection/secondscreen";
import { ICredentials } from "./credentials/model";
import { IConnectionConfig, IResolvedDevice } from "./device/model";
import { IDiscoveredDevice } from "./discovery/model";
import { openSocket } from "./socket/open";
import { Waker } from "./waker";

export async function openRemotePlay(
    waker: Waker,
    device: IResolvedDevice,
    discovered: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: ICredentials,
) {
    await waker.wake(discovered);

    return new RemotePlayDeviceConnection(
        waker,
        discovered,
        device.resolve.bind(device),
        config,
        creds,
    );
}

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
        return openRemotePlay(waker, device, discovered, config, creds);
    }
    return openSecondScreen(waker, device, discovered, config, creds);
}
