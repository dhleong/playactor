import debug from "debug";
import {
    Options,
    option,
} from "clime";

import { CredentialManager } from "../credentials";
import { PendingDevice } from "../device/pending";
import { IDiscoveredDevice, IDiscoveryConfig, INetworkConfig } from "../discovery/model";
import { StandardDiscoveryNetworkFactory } from "../discovery/standard";
import { MimCredentialRequester } from "../credentials/mim-requester";
import { DiskCredentialsStorage } from "../credentials/disk-storage";
import { IDevice } from "../device/model";
import { RootManagingCredentialRequester } from "../credentials/root-managing";

import { CliProxy } from "./cli-proxy";
import { RootProxyDevice } from "./root-proxy-device";

export class LoggingOptions extends Options {
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

    public logResult(result: any) {
        if (typeof result === "string") {
            console.log(result);
        } else {
            console.log(JSON.stringify(result, null, 2));
        }
    }

    public async configureLogging() {
        if (this.enableDebug) {
            debug.enable("playground:*");
        }
    }
}

export class DiscoveryOptions extends LoggingOptions {
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
        name: "ip",
        description: "Select a specific device by IP",
    })
    public deviceIp?: string;

    @option({
        name: "credentials",
        flag: "c",
        placeholder: "path",
        description: "Path to a file for storing credentials",
    })
    public credentialsPath?: string;

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
        const credentials = new CredentialManager(
            new RootManagingCredentialRequester(
                new MimCredentialRequester(
                    networkFactory,
                    networkConfig,
                ),
                proxiedUserId,
            ),
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

        // if we got here, the device was found! wrap it up in case we
        // need we need to request root privileges
        return new RootProxyDevice(
            new CliProxy(),
            device,
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
        }

        // TODO other selection mechanisms
        return { description, predicate };
    }
}
