import _debug from "debug";

import {
    IDiscoveredDevice,
    IDiscoveryMessage,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "../discovery/model";
import { DiscoveryVersions } from "../protocol";
import { CancellableAsyncSink } from "../util/async";
import { ICredentialRequester, ICredentials } from "./model";

const debug = _debug("playground:credentials:mim");

/**
 * The MimCredentialRequester works by emulating a PlayStation device
 * on the network that the PlayStation App can connect to. It then
 * acts as a "man in the middle" to intercept the credentials that
 * the app is passing.
 */
export class MimCredentialRequester implements ICredentialRequester {
    constructor(
        private readonly networkFactory: IDiscoveryNetworkFactory,
        private readonly networkConfig: INetworkConfig,
    ) {}

    public async requestForDevice(device: IDiscoveredDevice): Promise<ICredentials> {
        const sink = new CancellableAsyncSink<[IDiscoveryMessage, any]>();
        const localBindPort = device.discoveryVersion === DiscoveryVersions.PS4
            ? 987
            : 987; // TODO ?

        const network = this.networkFactory.createMessages({
            ...this.networkConfig,
            localBindPort,
        }, (message, sender) => {
            debug("received:", message, sender);
            sink.write([message, sender]);
        });

        sink.onCancel = () => network.close();

        for await (const [message, sender] of sink) {
            switch (message.type) {
                case "SRCH":
                    // FIXME: respond with status message, etc.
                    await network.send(sender.address, sender.port, "", {
                    });
                    break;

                case "WAKEUP":
                    debug("received WAKEUP from", sender);
                    return message.data;

                default:
                    break; // nop
            }
        }

        throw new Error("No credentials received");
    }
}
