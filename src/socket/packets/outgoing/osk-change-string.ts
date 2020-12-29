import { OutgoingPacket } from "../base";
import { PacketBuilder } from "../builder";
import { PacketType } from "../types";

export interface OskChangeStringOptions {
    /**
     * Seem to be a hint to the UI to indicate what text is "currently
     * being edited," which currently means this span will be visually
     * underlined. Useful if you're creating an interactive keyboard, I
     * guess
     */
    preEditIndex: number;
    preEditLength: number;

    /**
     * not sure what the practical use of this is. It seems
     * to initially indicate what part of the original text
     * was replaced, but the result of this packet is that
     * ALL the text is replaced by `string`, no matter what
     * values are passed in here. So... 0,0 is fine?
     */
    editIndex: number;
    editLength: number;

    /** where to put the caret within `string` */
    caretIndex: number;
}

const defaultOptions: Omit<OskChangeStringOptions, "caretIndex"> = {
    preEditIndex: 0,
    preEditLength: 0,
    editIndex: 0,
    editLength: 0,
};

export class OskChangeStringPacket extends OutgoingPacket {
    private static minLength = 28;

    public readonly type = PacketType.OskChangeString;
    public readonly totalLength: number;

    private readonly textBuffer: Buffer;

    constructor(
        text: string,
        private readonly options: Partial<OskChangeStringOptions> = {},
    ) {
        super();

        this.textBuffer = Buffer.from(text, "utf16le");
        this.totalLength = OskChangeStringPacket.minLength
            + this.textBuffer.length;
    }

    public fillBuffer(builder: PacketBuilder) {
        const opts = {
            ...defaultOptions,
            ...this.options,
        };

        const caretIndex = opts.caretIndex
            ?? opts.editIndex + this.textBuffer.length;

        builder
            .writeInt(opts.preEditIndex)
            .writeInt(opts.preEditLength)
            .writeInt(caretIndex)
            .writeInt(opts.editIndex)
            .writeInt(opts.editLength)
            .write(this.textBuffer);
    }
}
