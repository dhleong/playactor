import { spawnSync } from "child_process";
import { Printable } from "clime";

export interface ICliProxy {
    invoke(invocation: string[]): Promise<void>;
}

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

export class CliProxy {
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
