import { ExpectedError } from "clime";
import _debug from "debug";
import { IDeviceConnection } from "../connection/model";

import { IConnectionConfig, IDevice } from "../device/model";
import { INetworkConfig } from "../discovery/model";
import { RpcError } from "../socket/helpers";
import { LoginResultError } from "../socket/packets/incoming/login-result";
import { ExitCode } from "./exit-codes";
import { IInputOutput } from "./io";

const debug = _debug("playground:cli:pin");

/**
 * The PinAcceptingDevice delegates to another IDevice implementation
 * and, if a login error is encountered caused by a missing pincode,
 * will prompt for pincode input and retry login.
 *
 * This class is meant exclusively for use with the CLI; API clients
 * should almost certainly not use this.
 */
export class PinAcceptingDevice implements IDevice {
    constructor(
        private readonly io: IInputOutput,
        private readonly delegate: IDevice,
    ) {}

    public discover(config?: INetworkConfig) {
        return this.delegate.discover(config);
    }

    public async wake() {
        try {
            await this.delegate.wake();
        } catch (e) {
            const conn = await this.tryResolveError(e);
            conn.close();
        }
    }

    public async openConnection(config: IConnectionConfig = {}) {
        try {
            return await this.delegate.openConnection(config);
        } catch (e) {
            return this.tryResolveError(e, config);
        }
    }

    private async tryResolveError(
        e: any,
        config: IConnectionConfig = {},
    ): Promise<IDeviceConnection> {
        if (!(e instanceof RpcError)) {
            debug("non-login error encountered: ", e);
            throw e;
        }

        switch (e.code) {
            case LoginResultError.PIN_IS_NEEDED:
                return this.registerWithPincode(config);

            case LoginResultError.PASSCODE_IS_NEEDED:
                throw new ExpectedError(
                    "Login Error: Passcode is required",
                    ExitCode.PassCodeNeeded,
                );

            case LoginResultError.PASSCODE_IS_UNMATCHED:
                throw new ExpectedError(
                    "Login Error: Incorrect passcode",
                    ExitCode.PassCodeUnmatched,
                );

            default:
                // some other error
                debug("unexpected error: ", e);
                throw e;
        }
    }

    private async registerWithPincode(config: IConnectionConfig) {
        debug("pincode required; prompting from user...");

        this.io.logInfo(
            "Go to 'Settings -> Mobile App Connection Settings -> Add Device'"
            + " on your console to obtain the PIN code.",
        );
        const pinCode = await this.io.prompt("Pin code> ");

        debug("opening connection with user-provided pin");
        return this.delegate.openConnection({
            ...config,
            login: {
                ...config.login,
                pinCode,
            },
        });
    }
}
