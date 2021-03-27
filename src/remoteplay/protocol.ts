import _debug from "debug";
import got, { Options, OptionsOfBufferResponseBody } from "got";

import { IDiscoveredDevice } from "../discovery/model";
import {
    IDeviceProtocol, IPacket, IPacketReader, PacketReadState,
} from "../socket/model";
import { LengthDelimitedBufferReader } from "../socket/protocol/base";
import { errorReasonString } from "./model";
import { RemotePlayIncomingPacket } from "./packets";

const debug = _debug("playactor:remoteplay:protocol");

export const REST_PORT = 9295;
export const CRYPTO_NONCE_LENGTH = 16;

export function padBuffer(buffer: Buffer, expectedBytes: number = CRYPTO_NONCE_LENGTH) {
    if (buffer.length > expectedBytes) {
        throw new Error(`Expected ${expectedBytes} but buffer was ${buffer.length}`);
    }

    return Buffer.concat([
        buffer,
        Buffer.alloc(expectedBytes - buffer.length, 0),
    ]);
}

export function parseHexBytes(data: string) {
    const buffer = Buffer.alloc(data.length / 2);
    for (let i = 0; i < data.length; i += 2) {
        const byteAsString = data.slice(i, i + 2);
        const byte = parseInt(byteAsString, 16);
        buffer.writeUInt8(byte, i / 2);
    }
    return buffer;
}

export function parseBody<R>(body: Buffer): R {
    const message = body.toString("utf-8");
    return message.split("\r\n").reduce((m, line) => {
        /* eslint-disable no-param-reassign */
        const [k, v] = line.split(":");
        m[k] = v.trim();
        return m;
        /* eslint-enable no-param-reassign */
    }, {} as any) as R;
}

export async function request(url: string, options: Options) {
    if (debug.enabled) {
        debug("performing ", options.method ?? "GET", url);
        const withoutAgent = { ...options };
        delete withoutAgent.agent;
        debug(withoutAgent);
    }

    // NOTE: We *must* specify Content-Length: 0 for GET requests,
    // or else get a 403 response for some reason
    const result = await got(url, {
        ...options,
        headers: {
            "User-Agent": "remoteplay Windows",
            "Content-Length": options.method ? undefined : "0",
            ...options.headers,
        },
        decompress: false,
        responseType: "buffer",
        throwHttpErrors: false,
    } as OptionsOfBufferResponseBody);

    debug("result headers:", result.headers);
    debug("result body:", result.body.toString("base64"));

    if (result.statusCode >= 300) {
        let message = `Registration error: ${result.statusCode}: ${result.statusMessage}`;

        const reasonCode = result.headers["rp-application-reason"];
        if (reasonCode && !Array.isArray(reasonCode)) {
            const reason = errorReasonString(reasonCode);
            if (reason) {
                message += `: ${reason}`;
            }
        }

        throw new Error(message);
    }

    return result;
}

export function typedPath(device: IDiscoveredDevice, path: string) {
    return path.replace(":type", device.type.toLowerCase());
}

export function urlWith(device: IDiscoveredDevice, path: string) {
    return `http://${device.address.address}:${REST_PORT}${path}`;
}

const PACKET_TYPE_OFFSET = 4;

export class RemotePlayPacketReader implements IPacketReader {
    private readonly lengthDelimiter = new LengthDelimitedBufferReader(8);

    public read(data: Buffer, paddingSize?: number): PacketReadState {
        return this.lengthDelimiter.read(data, paddingSize);
    }

    public get(): IPacket {
        const buf = this.lengthDelimiter.get();
        const type = buf.readInt16LE(PACKET_TYPE_OFFSET);
        return new RemotePlayIncomingPacket(type, buf);
    }

    public remainder(): Buffer | undefined {
        return this.lengthDelimiter.remainder();
    }
}

export const RemotePlayDeviceProtocol: IDeviceProtocol = {
    version: { major: 10, minor: 0 },

    createPacketReader(): IPacketReader {
        throw new Error("Method not implemented.");
    },
};
