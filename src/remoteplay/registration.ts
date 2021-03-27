import _debug from "debug";
import { IDeviceRegistration } from "../credentials/model";

import {
    DeviceType,
    DiscoveryVersions,
    IDiscoveredDevice,
} from "../discovery/model";
import { UdpDiscoveryNetworkFactory } from "../discovery/udp";
import { delayMillis } from "../util/async";
import { RemotePlayCrypto } from "./crypto";
import {
    RemotePlayVersion,
    remotePlayVersionFor,
    remotePlayVersionToString,
} from "./model";
import {
    CRYPTO_NONCE_LENGTH,
    parseBody,
    request,
    typedPath,
    urlWith,
} from "./protocol";

const debug = _debug("playactor:remoteplay:registration");

const REGISTRATION_PORT = 9295;
const CLIENT_TYPE = "dabfa2ec873de5839bee8d3f4c0239c4282c07c25c6077a2931afcf0adc0d34f";
const CLIENT_TYPE_LEGACY = "Windows";

export interface IRemotePlayCredentials {
    accountId: string;
}

export interface IRemotePlayRegistrationCredentials extends IRemotePlayCredentials {
    pin: string;
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

        const registration = parseBody<IDeviceRegistration>(decoded);
        debug("registration map:", registration);

        const rpKey = registration["RP-Key"];
        if (!rpKey || rpKey.length !== 2 * CRYPTO_NONCE_LENGTH) {
            throw new Error(`Received invalid key from registration (value: ${rpKey})`);
        }

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
        const response = await request(this.urlFor(device), {
            body,
            headers: {
                "RP-Version": this.versionFor(device),
            },
            method: "POST",
        });
        return response.body;
    }

    private urlFor(device: IDiscoveredDevice) {
        const version = remotePlayVersionFor(device);
        const path = version < RemotePlayVersion.PS4_10
            ? "/sce/rp/regist" // PS4 with system version < 8.0
            : typedPath(device, "/sie/:type/rp/sess/rgst");

        return urlWith(device, path);
    }

    private versionFor(device: IDiscoveredDevice) {
        return remotePlayVersionToString(remotePlayVersionFor(device));
    }
}
