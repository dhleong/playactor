import _debug from "debug";
import got from "got";
import { IInputOutput } from "../../cli/io";

import { IDiscoveredDevice } from "../../discovery/model";
import { parseHexBytes } from "../../remoteplay/protocol";
import { RemotePlayRegistration } from "../../remoteplay/registration";
import { redact } from "../../util/redact";
import { ICredentialRequester, ICredentials } from "../model";
import { OauthStrategy } from "./model";

const debug = _debug("playactor:credentials:oauth");

// Remote Play Windows Client
// TODO: it'd be nice to pull these for macOS and Linux so any
// login history/notification will show the right platform
const CLIENT_ID = "ba495a24-818c-472b-b12d-ff231c1b5745";
const CLIENT_SECRET = "mvaiZkRsAsI1IBkY";

const REDIRECT_URI = "https://remoteplay.dl.playstation.net/remoteplay/redirect";
const LOGIN_URL = `https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize?service_entity=urn:service-entity:psn&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=psn:clientapp&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&prompt=always&PlatformPrivacyWs1=minimal&`;
const TOKEN_URL = "https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token";

interface RawAccountInfo {
    scopes: string; // eg: "psn:clientapp",
    expiration: string; // eg: "2021-03-21T15:19:42.198Z",
    client_id: string; // as passed in,
    dcim_id: string; // some kind of UUID,
    grant_type: string; // eg: "authorization_code",
    user_id: string; // a number
    user_uuid: string; // a UUID,
    online_id: string; // aka username,
    country_code: string; // eg: "US",
    language_code: string; // eg: "en",
    community_domain: string; // eg: "a6",
    is_sub_account: boolean,
}

export function extractAccountId(accountInfo: RawAccountInfo) {
    const asNumber = BigInt(accountInfo.user_id);
    const buffer = Buffer.alloc(8, "binary");
    buffer.writeBigUInt64LE(asNumber);
    return buffer.toString("base64");
}

export function registKeyToCredential(registKey: string) {
    // this is so bizarre, but here it is:

    // 1. Every 2 chars in data is interpreted as a hex byte
    const buffer = parseHexBytes(registKey);

    // 2. The bytes are treated as a utf-8-encoded string
    const asString = buffer.toString("utf-8");

    // 3. That string is parsed as a hex-encoded long
    const asNumber = BigInt(`0x${asString}`);

    // Finally, we convert that back into a string for storage
    return asNumber.toString();
}

export class OauthCredentialRequester implements ICredentialRequester {
    constructor(
        private io: IInputOutput,
        private strategy: OauthStrategy,
    ) {}

    public async requestForDevice(device: IDiscoveredDevice): Promise<ICredentials> {
        const accountId = await this.performOauth();

        this.io.logInfo("Registering with device via Remote Play.");
        this.io.logInfo("Go to Settings > System > Remote Play > Link Device");
        const pin = await this.io.prompt("Enter PIN here> ");

        const registration = await this.registerWithDevice(device, accountId, pin);

        const registKey = registration["PS5-RegistKey"]
            ?? registration["PS4-RegistKey"];
        if (!registKey) {
            throw new Error("Did not receive reigstration key");
        }

        const credential = registKeyToCredential(registKey);

        return {
            "app-type": "r",
            "auth-type": "R",
            "client-type": "vr",
            model: "w",
            "user-credential": credential,

            accountId,
            registration,
        };
    }

    private async performOauth() {
        const redirected = await this.strategy.performLogin(LOGIN_URL);

        const url = new URL(redirected);
        const code = url.searchParams.get("code");
        if (!code) {
            throw new Error("Did not get OAuth Code");
        }

        const accessToken = await this.exchangeCodeForAccess(code);
        debug(`Fetched access token (${redact(accessToken)}); requesting account info`);

        const accountInfo: RawAccountInfo = await got(`${TOKEN_URL}/${accessToken}`, {
            username: CLIENT_ID,
            password: CLIENT_SECRET,
        }).json();

        return extractAccountId(accountInfo);
    }

    private async registerWithDevice(device: IDiscoveredDevice, accountId: string, pin: string) {
        const registration = new RemotePlayRegistration();
        return registration.register(device, {
            accountId,
            pin,
        });
    }

    private async exchangeCodeForAccess(code: string) {
        const { access_token: accessToken } = await got.post(TOKEN_URL, {
            username: CLIENT_ID,
            password: CLIENT_SECRET,
            form: {
                code,
                grant_type: "authorization_code",
                redirect_uri: REDIRECT_URI,
            },
        }).json();

        if (!accessToken) {
            throw new Error("Did not receive OAuth access_token");
        }

        return accessToken;
    }
}
