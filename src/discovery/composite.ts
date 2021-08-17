import { IDiscoveryNetwork } from "./model";

export class CompositeDiscoveryNetwork implements IDiscoveryNetwork {
    constructor(
        private readonly delegates: IDiscoveryNetwork[],
    ) {}

    public close() {
        for (const delegate of this.delegates) {
            delegate.close();
        }
    }

    public async ping(deviceIp?: string) {
        await Promise.all(this.delegates.map(d => d.ping(deviceIp)));
    }

    public async send(
        recipientAddress: string,
        recipientPort: number,
        type: string,
        data?: Record<string, unknown>,
    ): Promise<void> {
        await Promise.all(this.delegates.map(d => d.send(
            recipientAddress,
            recipientPort,
            type,
            data,
        )));
    }

    public async sendBuffer(
        recipientAddress: string,
        recipientPort: number,
        message: Buffer,
    ) {
        await Promise.all(this.delegates.map(d => d.sendBuffer(
            recipientAddress,
            recipientPort,
            message,
        )));
    }
}
