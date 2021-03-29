import { RemotePlayDeviceConnection } from "./connection/remoteplay";
import { SecondScreenDeviceConnection } from "./connection/secondscreen";
import { ICredentials, IRemotePlayCredentials, isRemotePlay } from "./credentials/model";
import { IConnectionConfig, IResolvedDevice } from "./device/model";
import { IDiscoveredDevice } from "./discovery/model";
import { openSession } from "./remoteplay/session";
import { openSocket } from "./socket/open";
import { Waker } from "./waker";

export async function openRemotePlay(
    waker: Waker,
    device: IResolvedDevice,
    discovered: IDiscoveredDevice,
    config: IConnectionConfig,
    creds: IRemotePlayCredentials,
) {
    await waker.wake(discovered);

    const session = await openSession(
        discovered,
        config,
        creds,
    );

    return new RemotePlayDeviceConnection(session);
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
    if (isRemotePlay(creds)) {
        return openRemotePlay(waker, device, discovered, config, creds);
    }
    return openSecondScreen(waker, device, discovered, config, creds);
}
