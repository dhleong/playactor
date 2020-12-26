import { IDiscoveredDevice } from "../discovery/model";
import { IDeviceSocket } from "../socket/model";
import { openSocket } from "../socket/open";
import { IWakerFactory } from "../waker";

import { DeviceCapability, IResolvedDevice } from "./model";

export class ResolvedDevice implements IResolvedDevice {
    private socket?: IDeviceSocket;

    constructor(
        private readonly wakerFactory: IWakerFactory,
        private readonly description: IDiscoveredDevice,
    ) {}

    public get isConnected() {
        return this.socket?.isConnected === true;
    }

    public async discover() {
        return this.description;
    }

    public async open() {
        await this.getSocket();
    }

    public async close() {
        await this.socket?.close();
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

    private async getSocket() {
        const existing = this.socket;
        if (existing?.isConnected === true) return existing;

        const waker = this.wakerFactory.create();
        await waker.wake(this.description);

        const creds = await waker.credentials.getForDevice(this.description);

        const newSocket = await openSocket(
            waker.networkFactory,
            this.description,
            creds,
            // TODO socket/network config
        );
        this.socket = newSocket;
        return newSocket;
    }
}
