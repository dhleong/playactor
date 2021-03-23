import debug from "debug";
import {
    Options,
    option,
} from "clime";
import readline from "readline";

import { CredentialManager } from "../credentials";
import { PendingDevice } from "../device/pending";
import {
    defaultDiscoveryConfig,
    DeviceType,
    IDiscoveredDevice,
    IDiscoveryConfig,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "../discovery/model";
import { StandardDiscoveryNetworkFactory } from "../discovery/standard";
import { MimCredentialRequester } from "../credentials/mim-requester";
import { DiskCredentialsStorage } from "../credentials/disk-storage";
import { IConnectionConfig, IDevice } from "../device/model";
import { RootManagingCredentialRequester } from "../credentials/root-managing";

import { SudoCliProxy } from "./cli-proxy";
import { RootProxyDevice } from "./root-proxy-device";
import { IInputOutput } from "./io";
import { PinAcceptingDevice } from "./pin-accepting-device";
import { RejectingCredentialRequester } from "../credentials/rejecting-requester";
import { CliPassCode } from "./pass-code";
import { defaultSocketConfig, ISocketConfig } from "../socket/model";
import { CliOauthStrategy } from "../credentials/oauth/cli";
import { OauthCredentialRequester } from "../credentials/oauth/requester";
import { DeviceTypeStrategyCredentialRequester } from "../credentials/device-type-strategy";

const log = debug("playground:cli:options");

export class InputOutputOptions extends Options implements IInputOutput {
    /* eslint-disable no-console */

    @option({
        name: "debug",
        description: "Enable debug logging",
        toggle: true,
    })
    public enableDebug = false;

    @option({
        name: "machine-friendly",
        description: "Enable machine-friendly output",
        toggle: true,
    })
    public machineFriendly = false;

    public logError(error: any) {
        console.error(error);
    }

    public logInfo(message: string) {
        // NOTE: log on stderr by default so only "results"
        // are on stdout.
        console.error(message);
    }

    public logResult(result: any) {
        if (typeof result === "string") {
            console.log(result);
        } else if (this.machineFriendly) {
            console.log(JSON.stringify(result));
        } else {
            console.log(JSON.stringify(result, null, 2));
        }
    }

    public prompt(promptText: string) {
        return new Promise<string>(resolve => {
            const prompter = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            prompter.question(promptText, result => {
                prompter.close();
                resolve(result);
            });
        });
    }

    public async configureLogging() {
        if (this.enableDebug) {
            debug.enable("playground:*");
        }
    }
}

export class DiscoveryOptions extends InputOutputOptions {
    @option({
        name: "timeout",
        default: defaultDiscoveryConfig.timeoutMillis,
        description: "How long to look for device(s)",
        placeholder: "millis",
    })
    public searchTimeout = defaultDiscoveryConfig.timeoutMillis;

    @option({
        name: "connect-timeout",
        default: defaultSocketConfig.connectTimeoutMillis,
        description: "How long to look wait for connection",
        placeholder: "millis",
    })
    public connectTimeout = defaultSocketConfig.connectTimeoutMillis;

    @option({
        name: "bind-address",
        description: "Bind to a specific network adapter IP",
        placeholder: "ip",
    })
    public localBindAddress?: string;

    @option({
        name: "bind-port",
        description: "Bind on a specific port",
        placeholder: "port",
    })
    public localBindPort?: number;

    public get discoveryConfig(): Partial<IDiscoveryConfig> {
        return {
            timeoutMillis: this.searchTimeout,
        };
    }

    public get networkConfig(): INetworkConfig {
        return {
            localBindAddress: this.localBindAddress,
            localBindPort: this.localBindPort,
        };
    }

    public get socketConfig(): ISocketConfig {
        return {
            ...defaultSocketConfig,
            connectTimeoutMillis: this.connectTimeout,
        };
    }
}

export class DeviceOptions extends DiscoveryOptions {
    @option({
        name: "no-auth",
        description: "Don't attempt to authenticate if not already",
        toggle: true,
    })
    public dontAuthenticate = false;

    @option({
        name: "credentials",
        flag: "c",
        placeholder: "path",
        description: "Path to a file for storing credentials",
    })
    public credentialsPath?: string;

    @option({
        name: "pass-code",
        flag: "p",
        description: "Your numeric passcode, or a string of key names",
    })
    public passCode?: CliPassCode;

    @option({
        name: "ip",
        description: "Select a specific device by IP",
    })
    public deviceIp?: string;

    @option({
        name: "host-name",
        description: "Select a specific device by its host-name",
        placeholder: "name",
    })
    public deviceHostName?: string;

    @option({
        name: "host-id",
        description: "Select a specific device by its host-id",
        placeholder: "name",
    })
    public deviceHostId?: string;

    public async findDevice(): Promise<IDevice> {
        this.configureLogging();
        log("findDevice with:", this);

        const { description, predicate } = this.configurePending();

        const networkConfig: INetworkConfig = {
            ...this.connectionConfig.network,
        };

        const args = process.argv;
        const proxiedUserId = RootProxyDevice.extractProxiedUserId(args);

        const networkFactory = StandardDiscoveryNetworkFactory;
        const credentialsStorage = new DiskCredentialsStorage(
            this.credentialsPath,
        );
        const credentialsRequester = this.dontAuthenticate
            ? new RejectingCredentialRequester("Not authenticated")
            : this.buildCredentialsRequester(networkFactory, networkConfig, proxiedUserId);
        const credentials = new CredentialManager(
            credentialsRequester,
            credentialsStorage,
        );

        const device = new PendingDevice(
            description,
            predicate,
            networkConfig,
            this.discoveryConfig,
            networkFactory,
            credentials,
        );
        await device.discover();

        if (this.dontAuthenticate) {
            // no sense doing extra work
            return device;
        }

        // if we got here, the device was found! wrap it up in case we
        // need we need to request root privileges or something to
        // complete the login process
        return new RootProxyDevice(
            this,
            new SudoCliProxy(),
            new PinAcceptingDevice(this, device),
            {
                providedCredentialsPath: this.credentialsPath,
                effectiveCredentialsPath: credentialsStorage.filePath,
                invocationArgs: args,
                currentUserId: process.getuid(),
            },
        );
    }

    public get connectionConfig(): IConnectionConfig {
        return {
            network: this.networkConfig,
            socket: this.socketConfig,

            login: {
                passCode: this.passCode?.value ?? "",
            },
        };
    }

    private buildCredentialsRequester(
        networkFactory: IDiscoveryNetworkFactory,
        networkConfig: INetworkConfig,
        proxiedUserId: number,
    ) {
        const ps4 = new RootManagingCredentialRequester(
            new MimCredentialRequester(
                networkFactory,
                networkConfig,
            ),
            proxiedUserId,
        );

        const ps5 = new OauthCredentialRequester(
            this,
            new CliOauthStrategy(this),
        );

        return new DeviceTypeStrategyCredentialRequester({
            [DeviceType.PS4]: ps4,
            [DeviceType.PS5]: ps5,
        });
    }

    private configurePending() {
        let description = "any device";
        let predicate: (device: IDiscoveredDevice) => boolean = () => true;

        if (this.deviceIp) {
            description = `device at ${this.deviceIp}`;
            predicate = device => device.address.address === this.deviceIp;
        } else if (this.deviceHostName) {
            description = `device named ${this.deviceHostName}`;
            predicate = device => device.name === this.deviceHostName;
        } else if (this.deviceHostId) {
            description = `device with id ${this.deviceHostId}`;
            predicate = device => device.id === this.deviceHostId;
        }

        return { description, predicate };
    }
}
