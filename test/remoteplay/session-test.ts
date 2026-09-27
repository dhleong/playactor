import * as chai from "chai";
import { ConnectionIntent } from "../../src/device/model";
import { sessionRequiresLogin } from "../../src/remoteplay/session";

chai.should();

describe("sessionRequiresLogin", () => {
    it("skips login for standby", () => {
        sessionRequiresLogin({ intent: ConnectionIntent.STANDBY }).should.be.false;
    });

    it("logs in for every other intent", () => {
        [
            ConnectionIntent.LOGIN,
            ConnectionIntent.REMOTE_CONTROL,
            ConnectionIntent.KEYBOARD,
            ConnectionIntent.START_TITLE,
        ].forEach(intent => {
            sessionRequiresLogin({ intent }).should.be.true;
        });
    });

    it("logs in when no intent is given", () => {
        sessionRequiresLogin({}).should.be.true;
    });
});
