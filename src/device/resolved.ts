import { IDiscoveredDevice } from "../discovery/model";
import { IWakerFactory } from "../waker";

import { DeviceCapability, IResolvedDevice } from "./model";

export class ResolvedDevice implements IResolvedDevice {
    constructor(
        private readonly wakerFactory: IWakerFactory,
        private readonly description: IDiscoveredDevice,
    ) {}

    public get isConnected() {
        return false; // TODO
    }

    public async discover() {
        return this.description;
    }

    public async open() {
        const waker = this.wakerFactory.create();
        await waker.wake(this.description);
    }

    public async close() {
        // nop
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
}
