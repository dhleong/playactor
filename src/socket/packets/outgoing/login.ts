import os from "os";

import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export interface ILoginConfig {
    appLabel: string;
    model: string;
    osVersion: string;

    /** 4-byte user security code */
    passCode: string;

    /** authentication code from the device */
    pinCode: string;

    appendHostnameToModel: boolean;
}

const defaultConfig: ILoginConfig = {
    appLabel: "PlayStation",
    model: "PlayGround",
    osVersion: "4.4",
    passCode: "",
    pinCode: "",

    appendHostnameToModel: true,
};

export class LoginPacket extends OutgoingPacket {
    public readonly type = PacketType.Login;
    public readonly totalLength = 384;

    private readonly config: ILoginConfig;

    // NOTE: this is an "info" bitfield, but I'm not entirely
    // sure how to build it. here are some constants:
    //      INFO_ACCOUNT_ID_HASHED = 0;
    //      INFO_ACCOUNT_ID_RAW = 1;
    //      INFO_DEVICE_ANDROID = 0;
    //      INFO_DEVICE_IOS = 1;
    //      INFO_DEVICE_OTHERS = 3;
    //      INFO_DEVICE_VITA = 2;
    //      INFO_KIND_GAMECOMPANION = 1;
    //      INFO_KIND_SYSTEMCOMPANION = 0;
    //      INFO_SDK_VERSION = 4;
    public readonly info = 0x0201;

    constructor(
        private readonly userCredential: string,
        config: Partial<ILoginConfig> = {},
    ) {
        super();
        this.config = {
            ...defaultConfig,
            ...config,
        };
    }

    public fillBuffer(builder: PacketBuilder) {
        let { model } = this.config;
        if (this.config.appendHostnameToModel) {
            model += ` ${os.hostname()}`;
        }

        builder
            .writePadded(this.config.passCode, 4)
            .writeInt(this.info)
            .writePadded(this.userCredential, 64)
            .writePadded(this.config.appLabel, 256)
            .writePadded(this.config.osVersion, 16)
            .writePadded(model, 16)
            .writePadded(this.config.pinCode, 16);
    }
}
