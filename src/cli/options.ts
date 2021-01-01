import debug from "debug";
import {
    Options,
    option,
} from "clime";
import readline from "readline";

import { CredentialManager } from "../credentials";
import { PendingDevice } from "../device/pending";
import { IDiscoveredDevice, IDiscoveryConfig, INetworkConfig } from "../discovery/model";
import { StandardDiscoveryNetworkFactory } from "../discovery/standard";
import { MimCredentialRequester } from "../credentials/mim-requester";
import { DiskCredentialsStorage } from "../credentials/disk-storage";
import { IDevice } from "../device/model";
import { RootManagingCredentialRequester } from "../credentials/root-managing";

import { SudoCliProxy } from "./cli-proxy";
import { RootProxyDevice } from "./root-proxy-device";
import { IInputOutput } from "./io";
import { PinAcceptingDevice } from "./pin-accepting-device";
import { RejectingCredentialRequester } from "../credentials/rejecting-requester";

export class InputOutputOptions extends Options implements IInputOutput {
    /* eslint-disable no-console */

    @option({
        name: "debug",
        description: "Enable debug logging",
        toggle: true,
    })
    public enableDebug = false;

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
        description: "How long to look for device(s) (milliseconds)",
    })
    public deviceTimeout?: number;

    public get discoveryConfig(): Partial<IDiscoveryConfig> {
        return {
            timeoutMillis: this.deviceTimeout,
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

        const { description, predicate } = this.configurePending();

        const networkConfig: INetworkConfig = {
            // TODO
        };

        const args = process.argv;
        const proxiedUserId = RootProxyDevice.extractProxiedUserId(args);

        const networkFactory = StandardDiscoveryNetworkFactory;
        const credentialsStorage = new DiskCredentialsStorage(
            this.credentialsPath,
        );
        const credentialsRequester = this.dontAuthenticate
            ? new RejectingCredentialRequester("Not authenticated")
            : new RootManagingCredentialRequester(
                new MimCredentialRequester(
                    networkFactory,
                    networkConfig,
                ),
                proxiedUserId,
            );
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
