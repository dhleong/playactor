import { DeviceStatus, DiscoveryMessageType } from "./model";

interface IParsedMessage {
    type: DiscoveryMessageType;
    [key: string]: string;
}

const STATUS_CODE_STANDBY = "620";

export function parseMessage(raw: Buffer): IParsedMessage {
    const rawString = raw.toString();

    const lines = rawString.split("\n");
    if (!lines.length) {
        throw new Error(`Invalid message: no lines: ${raw.toString()}`);
    }

    const result: IParsedMessage & Record<string, string> = {
        type: DiscoveryMessageType.DEVICE,
    };

    const statusLine = lines[0];
    if (statusLine.startsWith("HTTP")) {
        // device response
        const status = statusLine.substring(
            statusLine.indexOf(" ") + 1,
        );

        result.statusLine = status;
        const [code, message] = status.split(" ");
        result.statusCode = code;
        result.statusMessage = message;
        result.status = code === STATUS_CODE_STANDBY
            ? DeviceStatus.STANDBY
            : DeviceStatus.AWAKE;
    } else {
        const method = statusLine.substring(0, statusLine.indexOf(" "));
        if (undefined === (DiscoveryMessageType as any)[method]) {
            throw new Error(`Unexpected discovery message: ${method}`);
        }
        result.type = method as DiscoveryMessageType;
    }

    for (let i = 1; i < lines.length; ++i) {
        const line = lines[i];
        const [key, value] = line.split(/:[ ]*/);
        if (value) {
            result[key.toLowerCase()] = value;
        }
    }

    return result;
}
