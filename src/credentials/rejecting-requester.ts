import { ICredentialRequester } from "./model";

/**
 * A simple ICredentialRequester implementation that always returns
 * a rejected Promise when credentials are requested.
 */
export const RejectingCredentialRequester: ICredentialRequester = {
    async requestForDevice() {
        throw new Error("Unable to request credentials");
    },
};
