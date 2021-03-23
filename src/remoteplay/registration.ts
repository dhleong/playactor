import _debug from "debug";
import got from "got";

import {
    DeviceType,
    IDiscoveredDevice,
} from "../discovery/model";
import { UdpDiscoveryNetworkFactory } from "../discovery/udp";
import { DiscoveryVersions } from "../protocol";
import { delayMillis } from "../util/async";
import { RemotePlayCrypto } from "./crypto";
import {
    errorReasonString, RemotePlayVersion, remotePlayVersionFor, remotePlayVersionToString,
} from "./model";

const debug = _debug("playground:remoteplay:registration");

const REGISTRATION_PORT = 9295;
const CLIENT_TYPE = "dabfa2ec873de5839bee8d3f4c0239c4282c07c25c6077a2931afcf0adc0d34f";
const CLIENT_TYPE_LEGACY = "Windows";

export interface IRemotePlayCredentials {
    accountId: string;
}

export interface IRemotePlayRegistrationCredentials extends IRemotePlayCredentials {
    pin: string;
}

export interface IDeviceRegistration {
    "AP-Bssid": string;
    "AP-Name": string; // eg: PS5
    "PS5-Mac"?: string;
    "PS5-RegistKey"?: string;
    "PS5-Nickname"?: string; // eg: PS5-123
    "RP-KeyType": string; // eg: 2
    "RP-Key": string;

    "PS4-Mac"?: string;
    "PS4-RegistKey"?: string;
    "PS4-Nickname"?: string; // eg: PS5-123
}

const searchConfigs = {
    [DeviceType.PS4]: {
        type: "SRC2",
        response: "RES2",
        version: DiscoveryVersions.PS4,
    },
    [DeviceType.PS5]: {
        type: "SRC3",
        response: "RES3",
        version: DiscoveryVersions.PS5,
    },
};

export class RemotePlayRegistration {
    public createPayload(
        crypto: RemotePlayCrypto,
        device: IDiscoveredDevice,
        credentials: IRemotePlayRegistrationCredentials,
    ) {
        const version = remotePlayVersionFor(device);
        return crypto.createSignedPayload({
            "Client-Type": version < RemotePlayVersion.PS4_10
                ? CLIENT_TYPE_LEGACY
                : CLIENT_TYPE,
            "Np-AccountId": credentials.accountId,
        });
    }

    public async register(
        device: IDiscoveredDevice,
        credentials: IRemotePlayRegistrationCredentials,
    ) {
        // NOTE: this search step is important; it lets the device know
        // that we're about to attempt a registration, I guess. If we
        // don't perform it, our registration request WILL be rejected
        await this.searchForDevice(device);

        const crypto = RemotePlayCrypto.forDeviceAndPin(device, credentials.pin);
        const body = this.createPayload(crypto, device, credentials);

        debug("request body", body.toString("hex"));
        debug("result length:", body.length);

        const response = await this.sendRegistrationRequest(device, body);
        const decoded = crypto.decrypt(response);
        debug("result decrypted:", decoded.toString("hex"));

        const message = decoded.toString("utf-8");
        const registration = message.split("\r\n").reduce((m, line) => {
            /* eslint-disable no-param-reassign */
            const [k, v] = line.split(":");
            m[k] = v.trim();
            return m;
            /* eslint-enable no-param-reassign */
        }, {} as any) as IDeviceRegistration;

        debug("registration map:", registration);
        return registration;
    }

    private async searchForDevice(device: IDiscoveredDevice) {
        const { type, response, version } = searchConfigs[device.type];

        const factory = new UdpDiscoveryNetworkFactory(REGISTRATION_PORT, version);

        debug("Performing SEARCH with", type);
        await new Promise<void>((resolve, reject) => {
            let timeout: NodeJS.Timeout;
            const net = factory.createRawMessages({
                localBindPort: REGISTRATION_PORT,
            }, message => {
                const asString = message.toString();
                debug("RECEIVED", message, asString);
                if (asString.substring(0, response.length) === response) {
                    clearTimeout(timeout);
                    net.close();
                    resolve();
                }
            });

            timeout = setTimeout(() => reject(new Error("Timeout")), 30000);

            net.sendBuffer(device.address.address, REGISTRATION_PORT, Buffer.from(type));
        });

        // NOTE: some devices may not accept requests immediately, so
        // give them a moment
        await delayMillis(100);
    }

    private async sendRegistrationRequest(
        device: IDiscoveredDevice,
        body: Buffer,
    ) {
        const result = await got.post(this.urlFor(device), {
            body,
            headers: {
                "User-Agent": "remoteplay Windows",
                "RP-Version": this.versionFor(device),
            },
            decompress: false,
            responseType: "buffer",
            throwHttpErrors: false,
        });

        debug("result headers:", result.headers);
        debug("result body:", result.body.toString("base64"));

        if (result.statusCode >= 300) {
            let message = `Registration error: ${result.statusCode}: ${result.statusMessage}`;

            const reasonCode = result.headers["rp-application-reason"];
            if (reasonCode && !Array.isArray(reasonCode)) {
                const reason = errorReasonString(reasonCode);
                if (reason) {
                    message += `: ${reason}`;
                }
            }

            throw new Error(message);
        }

        return result.body;
    }

    private urlFor(device: IDiscoveredDevice) {
        const version = remotePlayVersionFor(device);
        const path = version < RemotePlayVersion.PS4_10
            ? "/sce/rp/regist" // PS4 with system version < 8.0
            : `/sie/${device.type.toLowerCase()}/rp/sess/rgst`;

        return `http://${device.address.address}:${REGISTRATION_PORT}${path}`;
    }

    private versionFor(device: IDiscoveredDevice) {
        return remotePlayVersionToString(remotePlayVersionFor(device));
    }
}
