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

    constructor(
        private readonly protocolVersion: number,
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
            .writeInt(this.protocolVersion)
            .writePadded(this.userCredential, 64)
            .writePadded(this.config.appLabel, 256)
            .writePadded(this.config.osVersion, 16)
            .writePadded(model, 16)
            .writePadded(this.config.pinCode, 16);
    }
}
