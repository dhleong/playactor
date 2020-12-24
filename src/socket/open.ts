import _debug from "debug";

import { ICredentials } from "../credentials/model";
import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { DiscoveryVersions, formatDiscoveryMessage } from "../protocol";
import { delayMillis } from "../util/async";
import { IWakerNetwork, IWakerNetworkFactory } from "../waker/model";

import { defaultSocketConfig, IDeviceSocket, ISocketConfig } from "./model";
import { TcpDeviceSocket } from "./tcp";

const debug = _debug("playground:socket:open");

function openConnection(
    device: IDiscoveredDevice,
    config: ISocketConfig,
): Promise<IDeviceSocket> {
    switch (device.discoveryVersion) {
        case DiscoveryVersions.PS4:
            return TcpDeviceSocket.connectTo(
                device,
                config,
            );

        default:
            throw new Error(`Unsupported protocol: ${device.discoveryVersion}`);
    }
}

async function attemptOpen(
    waker: IWakerNetwork,
    device: IDiscoveredDevice,
    credentials: ICredentials,
    config: ISocketConfig,
) {
    // send some packets to make sure the device is willing to accept our
    // TCP connection
    await waker.sendTo(device, formatDiscoveryMessage({
        data: credentials,
        type: "WAKEUP",
        version: device.discoveryVersion,
    }));
    await waker.sendTo(device, formatDiscoveryMessage({
        data: credentials,
        type: "LAUNCH",
        version: device.discoveryVersion,
    }));

    // slight delay to give it a chance to respond
    await delayMillis(250);
    waker.close();

    const socket = await openConnection(device, config);

    // TODO login protocol

    return socket;
}

function isRetryable(error: any) {
    return error.code === "ECONNREFUSED";
}

export async function openSocket(
    wakerFactory: IWakerNetworkFactory,
    device: IDiscoveredDevice,
    credentials: ICredentials,
    socketConfig: Partial<ISocketConfig> = {},
    networkConfig: INetworkConfig = {},
) {
    const waker = wakerFactory.create(networkConfig);
    const mySocketConfig = {
        ...defaultSocketConfig,
        ...socketConfig,
    };

    for (let i = 0; i < mySocketConfig.maxRetries; ++i) {
        /* eslint-disable no-await-in-loop */

        try {
            return await attemptOpen(
                waker,
                device,
                credentials,
                mySocketConfig,
            );
        } catch (e) {
            if (isRetryable(e) && i + 1 !== mySocketConfig.maxRetries) {
                const backoff = mySocketConfig.retryBackoffMillis * (i + 1);
                debug("encountered retryable error:", e);
                debug("retrying after", backoff);
                delayMillis(backoff);
            } else {
                debug("cannot retry:", e);
                throw e;
            }
        }
    }
}