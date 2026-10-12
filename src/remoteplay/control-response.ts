const MAX_HTTP_HEADER_SIZE = 64 * 1024;

export interface IControlResponse {
    encryptedServerType: string;
    remainingData: Buffer;
}

/**
 * Parse the HTTP response that precedes the Remote Play binary protocol.
 * Returns undefined until the complete HTTP headers have arrived.
 */
export function parseControlResponse(
    received: Buffer,
): IControlResponse | undefined {
    const headerEnd = received.indexOf("\r\n\r\n");

    if (headerEnd === -1) {
        if (received.length > MAX_HTTP_HEADER_SIZE) {
            throw new Error(
                "Remote Play session control HTTP headers are too large",
            );
        }
        return undefined;
    }

    if (headerEnd > MAX_HTTP_HEADER_SIZE) {
        throw new Error(
            "Remote Play session control HTTP headers are too large",
        );
    }

    const headerText = received.slice(0, headerEnd).toString("latin1");
    const lines = headerText.split("\r\n");
    const statusLine = lines.shift() ?? "";

    const statusMatch = /^HTTP\/1\.[01]\s+(\d{3})/.exec(statusLine);

    if (!statusMatch) {
        throw new Error(
            `Invalid Remote Play session control response: ${statusLine}`,
        );
    }

    const statusCode = Number(statusMatch[1]);
    const headers: Record<string, string> = {};

    for (const line of lines) {
        const separator = line.indexOf(":");

        if (separator === -1) {
            continue;
        }

        const name = line.slice(0, separator).trim().toLowerCase();
        const value = line.slice(separator + 1).trim();

        headers[name] = value;
    }

    if (statusCode >= 300) {
        const reason = headers["rp-application-reason"];

        throw new Error(
            `Remote Play session control HTTP ${statusCode}${
                reason ? ` (RP reason: ${reason})` : ""}`,
        );
    }

    const encryptedServerType = headers["rp-server-type"];

    if (!encryptedServerType) {
        throw new Error(
            "Missing Remote Play session control RP-Server-Type header",
        );
    }

    return {
        encryptedServerType,
        remainingData: received.slice(headerEnd + 4),
    };
}
