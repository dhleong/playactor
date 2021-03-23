import {
    IDiscoveredDevice,
    IDiscoveryNetwork,
    IDiscoveryNetworkFactory,
    INetworkConfig,
    OnDeviceDiscoveredHandler,
} from "../../src/discovery/model";

export class MockDiscoveryNetwork implements IDiscoveryNetwork {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    public async send(
        _recipientAddress: string,
        _recipientPort: number,
        _type: string,
        _data?: Record<string, unknown>,
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async sendBuffer(
        _recipientAddress: string,
        _recipientPort: number,
        _buffer: Buffer,
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */

    public close() {
        // nop
    }

    public async ping(): Promise<void> {
        // nop
    }
}

export class MockDiscoveryNetworkFactory implements IDiscoveryNetworkFactory {
    public readonly network = new MockDiscoveryNetwork();
    public pendingDevices: IDiscoveredDevice[] = [];

    public createDevices(_config: INetworkConfig, onDevice: OnDeviceDiscoveredHandler) {
        const oldPing = this.network.ping;
        this.network.ping = async () => {
            for (const d of this.pendingDevices) {
                onDevice(d);
            }
            oldPing();
        };
        return this.network;
    }

    public createMessages() {
        return this.network;
    }

    public createRawMessages() {
        return this.network;
    }
}
