import { DeviceConnection } from "../connection";
import { IDiscoveredDevice, INetworkConfig } from "../discovery/model";
import { ISocketConfig } from "../socket/model";
import { openSocket } from "../socket/open";
import { IWakerFactory } from "../waker";

import { DeviceCapability, IResolvedDevice } from "./model";

export class ResolvedDevice implements IResolvedDevice {
    constructor(
        private readonly wakerFactory: IWakerFactory,
        private readonly description: IDiscoveredDevice,
    ) {}

    public async discover() {
        return this.description;
    }

    public async wake() {
        await this.startWaker();
    }

    public async openConnection(
        socketConfig?: ISocketConfig,
        networkConfig?: INetworkConfig,
    ) {
        const waker = await this.startWaker();
        const creds = await waker.credentials.getForDevice(
            this.description,
        );

        const socket = await openSocket(
            waker.networkFactory,
            this.description,
            creds,
            socketConfig,
            networkConfig,
        );

        return new DeviceConnection(socket);
    }

    public isSupported(capability: DeviceCapability): boolean {
        switch (capability) {
            case DeviceCapability.WAKE:
                // all devices support wake so far
                return true;

            default:
                return false;
        }
    }

    private async startWaker() {
        const waker = this.wakerFactory.create();
        await waker.wake(this.description);
        return waker;
    }
}
