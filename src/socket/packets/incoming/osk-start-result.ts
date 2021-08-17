import { OskActionType, OskFlags, OskInputType } from "../../osk";
import { IncomingResultPacket } from "../base";
import { PacketType } from "../types";

export class OskStartResultPacket extends IncomingResultPacket {
    /* eslint-disable no-bitwise */

    public type = PacketType.OskStartResult;

    /**
     * oskType is a bit mask structed as:
     *
     * 0x0F0 - action type
     * 0x003 - basic input types
     * 0x300 - extended input types (meant to be >>6 to become 4, 8)
     * 0x004 - multi-line flag
     * 0x008 - password mode flag
     * 0x400 - auto capitalize flag
     */
    public readonly oskType: number;
    public readonly maxLength: number;
    public readonly initialContent: string;

    constructor(data: Buffer) {
        super(data);

        this.oskType = data.readInt32LE(12);
        this.maxLength = data.readInt32LE(16);
        this.initialContent = data.toString("utf16le", 20);
    }

    public get actionType() {
        return ((this.oskType & 0x0F0) >>> 4) as OskActionType;
    }

    public get inputType() {
        const basic = this.oskType & 0x003;
        const extended = (this.oskType & 0x300) >>> 6;
        return (basic | extended) as OskInputType;
    }

    public get flags() {
        const mask = OskFlags.AutoCapitalize | OskFlags.MultiLine | OskFlags.Password;
        return (this.oskType & mask) as OskFlags;
    }
}
