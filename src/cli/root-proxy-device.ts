import { Printable } from "clime";
import _debug from "debug";
import { resolve as realResolvePath } from "path";

import { RootMissingError } from "../credentials/root-managing";
import { IDevice } from "../device/model";
import { INetworkConfig } from "../discovery/model";
import { ISocketConfig } from "../socket/model";
import { ICliProxy } from "./cli-proxy";

const debug = _debug("playground:cli:root");

const PROXIED_ID_ARG = "--proxied-user-id";

export class RootProxiedError extends Error implements Printable {
    public print() {
        debug("root proxied; this process became nop");
    }
}

export interface IRootProxyConfig {
    providedCredentialsPath?: string,
    effectiveCredentialsPath: string,
    invocationArgs: string[],
    currentUserId: number,
}

export class RootProxyDevice implements IDevice {
    public static extractProxiedUserId(
        args: string[],
    ): number {
        const argIndex = args.indexOf(PROXIED_ID_ARG);
        const valueIndex = argIndex + 1;
        if (valueIndex > 0 && valueIndex < args.length) {
            return parseInt(args[valueIndex], 10);
        }

        return process.getuid();
    }

    constructor(
        private readonly cliProxy: ICliProxy,
        private readonly delegate: IDevice,
        private readonly config: IRootProxyConfig,
        private readonly resolvePath: (p: string) => string = realResolvePath,
    ) {}

    public async discover(config?: INetworkConfig) {
        return this.delegate.discover(config);
    }

    public async wake() {
        try {
            await this.delegate.wake();
        } catch (e) {
            await this.tryResolveError(e);
        }
    }

    public async openConnection(socketConfig?: ISocketConfig) {
        try {
            return await this.delegate.openConnection(socketConfig);
        } catch (e) {
            await this.tryResolveError(e);

            // NOTE: this should never happen (note the Promise<never>
            // return type) but typescript doesn't agree, so we re-throw
            // here to make sure the interface matches properly
            throw e;
        }
    }

    private async tryResolveError(e: any): Promise<never> {
        if (e instanceof RootMissingError) {
            if (!this.config.currentUserId) {
                // already root, but root missing? this probably
                // shouldn't happen...
                throw e;
            }

            await this.proxyCliInvocation();

            throw new RootProxiedError();
        }

        // nothing to resolve
        throw e;
    }

    private async proxyCliInvocation() {
        const baseArgs = [...this.config.invocationArgs];

        if (!this.config.providedCredentialsPath) {
            // if we aren't already explicitly passing a credentials
            // file path, do so now (to avoid potential confusion)
            baseArgs.push("--credentials");
            baseArgs.push(this.config.effectiveCredentialsPath);
        } else {
            // if we *did* provide credentials, we need to make sure the
            // full path is resolved, just in case sudo changes things
            // in weird ways (for example, if they used ~ in the path,
            // and being sudo changes the meaning of that)
            const oldIndex = baseArgs.indexOf(this.config.providedCredentialsPath);
            baseArgs[oldIndex] = this.resolvePath(this.config.providedCredentialsPath);
        }

        await this.cliProxy.invoke([
            ...baseArgs,
            PROXIED_ID_ARG,
            this.config.currentUserId.toString(),
        ]);
    }
}
