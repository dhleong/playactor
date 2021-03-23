import { DeviceType, IDiscoveredDevice } from "../discovery/model";
import { ICredentialRequester, ICredentials } from "./model";

export interface IDeviceStrategyMap {
    [DeviceType.PS4]: ICredentialRequester,
    [DeviceType.PS5]: ICredentialRequester,
}

export class DeviceTypeStrategyCredentialRequester implements ICredentialRequester {
    constructor(
        private readonly strategies: IDeviceStrategyMap,
    ) {}

    public requestForDevice(device: IDiscoveredDevice): Promise<ICredentials> {
        const strategy = this.strategies[device.type];
        return strategy.requestForDevice(device);
    }
}
