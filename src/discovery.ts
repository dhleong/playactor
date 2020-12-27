import _debug from "debug";

import {
    defaultDiscoveryConfig,
    IDiscoveredDevice,
    IDiscoveryConfig,
    IDiscoveryNetworkFactory,
    INetworkConfig,
} from "./discovery/model";
import { StandardDiscoveryNetworkFactory } from "./discovery/standard";

import { CancellableAsyncSink } from "./util/async";

const debug = _debug("playground:discovery");

export class Discovery {
    private readonly discoveryConfig: IDiscoveryConfig;

    constructor(
        config: Partial<IDiscoveryConfig> = {},
        private readonly networkFactory: IDiscoveryNetworkFactory = StandardDiscoveryNetworkFactory,
    ) {
        this.discoveryConfig = {
            ...defaultDiscoveryConfig,
            ...config,
        };
    }

    public discover(
        networkConfig: INetworkConfig = {},
        discoveryConfig: Partial<IDiscoveryConfig> = {},
    ): AsyncIterable<IDiscoveredDevice> {
        const fullConfig = { ...this.discoveryConfig, ...discoveryConfig };
        debug("discover(", fullConfig, ")");

        const sink = new CancellableAsyncSink<IDiscoveredDevice>();
        const network = this.networkFactory.createDevices(networkConfig, device => {
            sink.write(device);
        });

        const discoverInterval = setInterval(() => {
            debug("sending network discovery ping");
            network.ping();
        }, fullConfig.pingIntervalMillis);

        function stopDiscovering() {
            clearInterval(discoverInterval);
            network.close();
            sink.end();
        }

        const timeout = setTimeout(
            stopDiscovering,
            fullConfig.timeoutMillis,
        );

        sink.onCancel = () => {
            clearTimeout(timeout);
            stopDiscovering();
        };

        return sink;
    }
}
