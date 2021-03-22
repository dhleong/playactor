import _debug from "debug";
import got from "got";

import {
    IDiscoveredDevice,
} from "../discovery/model";
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
        const crypto = RemotePlayCrypto.forDeviceAndPin(device, credentials.pin);
        const body = this.createPayload(crypto, device, credentials);

        debug("request body", body.toString("hex"));
        debug("result length:", body.length);

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

        const decoded = crypto.decrypt(result.body);
        debug("result decrypted:", decoded);

        return decoded;
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
