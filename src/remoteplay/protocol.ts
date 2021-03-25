import _debug from "debug";
import got, { Options, OptionsOfBufferResponseBody } from "got";

import { IDiscoveredDevice } from "../discovery/model";
import { errorReasonString } from "./model";

const debug = _debug("playactor:remoteplay:protocol");

export const REST_PORT = 9295;

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
    debug("performing ", options.method ?? "GET", url);
    debug(options);

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
