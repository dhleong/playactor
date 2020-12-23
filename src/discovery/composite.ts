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

    public async ping() {
        await Promise.all(this.delegates.map(d => d.ping()))
    }
}
