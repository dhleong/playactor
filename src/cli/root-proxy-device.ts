import { Printable } from "clime";
import _debug from "debug";
import { resolve as realResolvePath } from "path";

import { RootMissingError } from "../credentials/root-managing";
import { IDevice } from "../device/model";
import { INetworkConfig } from "../discovery/model";
import { ISocketConfig } from "../socket/model";
import { ICliProxy } from "./cli-proxy";
import { ILogging } from "./logging";

const debug = _debug("playground:cli:root");

const PROXIED_ID_ARG = "--proxied-user-id";

export class RootProxiedError extends Error implements Printable {
    public print() {
        debug("root proxied; this process became nop");
    }
}

function stopCurrentInvocationForProxy() {
    throw new RootProxiedError();
}

export interface IRootProxyConfig {
    providedCredentialsPath?: string,
    effectiveCredentialsPath: string,
    invocationArgs: string[],
    currentUserId: number,
}

/**
 * The RootProxyDevice wraps another IDevice implementation and delegates
 * entirely to it. If `wake` or `openConnection` reject with a
 * RootMissingError, the error will be suppressed and, if possible, the
 * CLI invocation will be "proxied" into a new subprocess that will
 * request root and this process will be gracefully stopped with the same
 * exit code as the "proxied" subprocess.
 *
 * This class is meant exclusively for use with the CLI; API clients
 * should almost certainly not use this.
 */
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
        private readonly logging: ILogging,
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

            stopCurrentInvocationForProxy();
        }

        // nothing to resolve
        throw e;
    }

    private async proxyCliInvocation() {
        const baseArgs = [...this.config.invocationArgs];

        if (!this.config.providedCredentialsPath) {
            // if we aren't already explicitly passing a credentials
            // file path, do so now (to avoid potential confusion)
            baseArgs.push(
                "--credentials",
                this.config.effectiveCredentialsPath,
            );
        } else {
            // if we *did* provide credentials, we need to make sure the
            // full path is resolved, just in case sudo changes things
            // in weird ways (for example, if they used ~ in the path,
            // and being sudo changes the meaning of that)
            const oldIndex = baseArgs.indexOf(this.config.providedCredentialsPath);
            baseArgs[oldIndex] = this.resolvePath(this.config.providedCredentialsPath);
        }

        this.logging.logInfo("Attempting to request root permissions now (we will relinquish them as soon as possible)");
        this.logging.logInfo("playground needs root permissions as part of the credentials-requesting process");

        await this.cliProxy.invoke([
            ...baseArgs,
            PROXIED_ID_ARG,
            this.config.currentUserId.toString(),
        ]);
    }
}
