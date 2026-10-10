import * as chai from "chai";
import * as sinon from "sinon";
import chaiAsPromised from "chai-as-promised";
import sinonChai from "sinon-chai";

import { ICredentialRequester } from "../../src/credentials/model";
import { RootManagingCredentialRequester } from "../../src/credentials/root-managing";
import { IDiscoveredDevice } from "../../src/discovery/model";

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.should();

describe("RootManagingCredentialRequester", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("restores the user ID when credential acquisition fails", async () => {
        const error = new Error("credential failure");

        const delegate: ICredentialRequester = {
            async requestForDevice() {
                throw error;
            },
        };

        sinon.stub(process, "getuid").returns(0);
        const setuid = sinon.stub(process, "setuid");

        const requester = new RootManagingCredentialRequester(delegate, 1000);
        const device = {} as IDiscoveredDevice;

        await requester.requestForDevice(device)
            .should.be.rejectedWith(error);

        setuid.should.have.been.calledOnceWith(1000);
    });
});
