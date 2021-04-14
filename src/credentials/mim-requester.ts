import _debug from "debug";
import { IInputOutput } from "../cli/io";

import {
    IDiscoveredDevice,
    IDiscoveryMessage,
    IDiscoveryNetwork,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "../discovery/model";
import { CancellableAsyncSink } from "../util/async";
import { wakePortsByType } from "../waker/udp";
import { ICredentialRequester, ICredentials } from "./model";

export interface IEmulatorOptions {
    hostId: string;
    hostName: string;
}

const defaultEmulatorOptions = {
    hostId: "1234567890AB",
    hostName: "PlayActor",
};

const debug = _debug("playactor:credentials:mim");

/**
 * The MimCredentialRequester works by emulating a PlayStation device
 * on the network that the PlayStation App can connect to. It then
 * acts as a "man in the middle" to intercept the credentials that
 * the app is passing.
 */
export class MimCredentialRequester implements ICredentialRequester {
    private readonly emulatorOptions: IEmulatorOptions;

    constructor(
        private readonly networkFactory: IDiscoveryNetworkFactory,
        private readonly networkConfig: INetworkConfig,
        private readonly io?: IInputOutput,
        emulatorOptions: Partial<IEmulatorOptions> = {},
    ) {
        this.emulatorOptions = {
            ...defaultEmulatorOptions,
            ...emulatorOptions,
        };
    }

    public async requestForDevice(device: IDiscoveredDevice): Promise<ICredentials> {
        const sink = new CancellableAsyncSink<IDiscoveryMessage>();
        const localBindPort = wakePortsByType[device.type];
        if (!localBindPort) {
            throw new Error(`Unexpected discovery protocol: ${device.discoveryVersion}`);
        }

        const network = this.networkFactory.createMessages({
            ...this.networkConfig,
            localBindPort,
        }, message => {
            debug("received:", message);
            sink.write(message);
        });

        sink.onCancel = () => network.close();

        this.io?.logInfo("Registering with device via Second Screen.");
        this.io?.logInfo("Open the PS4 Second Screen app and attempt to connect to the device named:");
        this.io?.logInfo(`  ${this.emulatorOptions.hostName}`);

        debug("emulating device; awaiting WAKE...");
        return this.emulateUntilWoken(
            sink,
            network,
            device.type,
            localBindPort,
        );
    }

    private async emulateUntilWoken(
        incomingMessages: AsyncIterable<IDiscoveryMessage>,
        network: IDiscoveryNetwork,
        hostType: string,
        localBindPort: number,
    ) {
        const searchStatus = "HTTP/1.1 620 Server Standby";
        const searchResponse = {
            "host-id": this.emulatorOptions.hostId,
            "host-name": this.emulatorOptions.hostName,
            "host-type": hostType,
            "host-request-port": localBindPort,
        };

        for await (const message of incomingMessages) {
            const { sender } = message;
            switch (message.type) {
                case "SRCH":
                    debug("respond to SRCH request from", sender);
                    await network.send(
                        sender.address,
                        sender.port,
                        searchStatus,
                        searchResponse,
                    );
                    break;

                case "WAKEUP":
                    debug("received WAKEUP from", sender);
                    return message.data as unknown as ICredentials;

                default:
                    break; // nop
            }
        }

        throw new Error("No credentials received");
    }
}
