import { spawnSync } from "child_process";
import { Printable } from "clime";

/**
 * An ICliProxy can execute some CLI program passed to it with
 * arguments.  Declared as an interface here mostly so that it can be
 * stubbed in tests
 */
export interface ICliProxy {
    invoke(invocation: string[]): Promise<void>;
}

/**
 * Represents an error encountered by the "proxied" subprocess.  When
 * "printed" by the CLI framework, it will print the error message to
 * stderr and exit this process with the same exit code with which the
 * subprocess exited.
 */
export class CliProxyError extends Error implements Printable {
    constructor(
        message: string,
        public readonly errorCode: number,
    ) {
        super(message);
    }

    public print(
        stdout: NodeJS.WritableStream,
        stderr: NodeJS.WritableStream,
    ) {
        stderr.write(this.message);
        process.exit(this.errorCode);
    }
}

/**
 * An implementation of ICliProxy that prefixes the provided invocation
 * with `sudo` (or whatever other program you prefer)
 */
export class SudoCliProxy {
    constructor(
        private readonly sudo: string = "sudo",
    ) {}

    public async invoke(
        invocation: string[],
    ) {
        const result = await spawnSync(this.sudo, invocation, {
            stdio: "inherit",
        });

        if (result.error) {
            if ((result.error as any).errno) {
                throw new CliProxyError(
                    result.error.message,
                    (result.error as any).errno,
                );
            }

            throw new CliProxyError(result.error.message, 0);
        }
    }
}
