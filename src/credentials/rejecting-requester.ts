import { ICredentialRequester, ICredentials } from "./model";

const defaultMessage = "Unable to request credentials";

/**
 * A simple ICredentialRequester implementation that always returns
 * a rejected Promise when credentials are requested.
 */
export class RejectingCredentialRequester implements ICredentialRequester {
    constructor(
        private readonly message: string = defaultMessage,
    ) {}

    public async requestForDevice(): Promise<ICredentials> {
        throw new Error(this.message);
    }
}
