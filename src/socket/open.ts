import _debug from "debug";

import { ICredentials } from "../credentials/model";
import { DeviceType, IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { formatDiscoveryMessage } from "../protocol";
import { delayMillis } from "../util/async";
import { IWakerNetwork, IWakerNetworkFactory } from "../waker/model";

import { defaultSocketConfig, IDeviceSocket, ISocketConfig } from "./model";
import { ILoginConfig } from "./packets/outgoing/login";
import { HandshakeProc } from "./proc/handshake";
import { LoginProc } from "./proc/login";
import { TcpDeviceSocket } from "./tcp";

const debug = _debug("playground:socket:open");

/**
 * If thrown when trying to authenticate, the device has probably
 * closed the socket and, because we're not authenticated, will
 * be unable to do so.
 */
export class ConnectionRefusedError extends Error {
    constructor() {
        super("Connection refused; if unauthenticated, try restarting the device");
    }
}

export class UnsupportedDeviceError extends Error {
    constructor() {
        super("Device doesn't support connection");
    }
}

function openConnection(
    device: IDiscoveredDevice,
    config: ISocketConfig,
): Promise<IDeviceSocket> {
    switch (device.type) {
        case DeviceType.PS4:
            return TcpDeviceSocket.connectTo(
                device,
                config,
            );

        default:
            throw new UnsupportedDeviceError();
    }
}

async function attemptOpen(
    waker: IWakerNetwork,
    device: IDiscoveredDevice,
    credentials: ICredentials,
    config: ISocketConfig,
    loginConfig: Partial<ILoginConfig> = {},
) {
    // send some packets to make sure the device is willing to accept our
    // TCP connection
    debug("requesting device wake up to ensure socket availability");
    const credsRecord = credentials as unknown as Record<string, unknown>;
    await waker.sendTo(device, formatDiscoveryMessage({
        data: credsRecord,
        type: "WAKEUP",
        version: device.discoveryVersion,
    }));
    await waker.sendTo(device, formatDiscoveryMessage({
        data: credsRecord,
        type: "LAUNCH",
        version: device.discoveryVersion,
    }));

    // slight delay to give it a chance to respond
    await delayMillis(250);
    waker.close();

    debug("attempting to open socket...");
    const socket = await openConnection(device, config);

    debug("performing handshake and login...");
    await socket.execute(new HandshakeProc());
    await socket.execute(new LoginProc(credentials, loginConfig));

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
    loginConfig: Partial<ILoginConfig> = {},
) {
    const mySocketConfig = {
        ...defaultSocketConfig,
        ...socketConfig,
    };

    let wasRefused = false;
    for (let i = 0; i < mySocketConfig.maxRetries; ++i) {
        /* eslint-disable no-await-in-loop */

        const waker = wakerFactory.create(networkConfig);
        try {
            return await attemptOpen(
                waker,
                device,
                credentials,
                mySocketConfig,
                loginConfig,
            );
        } catch (e) {
            wasRefused = wasRefused || e.code === "ECONNREFUSED";

            if (isRetryable(e) && i + 1 !== mySocketConfig.maxRetries) {
                const backoff = mySocketConfig.retryBackoffMillis * (i + 1);
                debug("encountered retryable error:", e);
                debug("retrying after", backoff);
                await delayMillis(backoff);
            } else if (wasRefused) {
                debug("can no longer retry (was refused): ", e);
                throw new ConnectionRefusedError();
            } else {
                debug("cannot retry:", e);
                throw e;
            }
        }
    }

    throw new Error("Failed to open a connection");
}
