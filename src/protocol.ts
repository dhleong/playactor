import { DiscoveryVersion, outgoingDiscoveryKeys } from "./discovery/model";

/**
 * Formats a discovery message. Requests are identified by their type
 * (eg: "SRCH"), to which the " * HTTP/1.1" protocol marker is appended;
 * responses already carry a full status line (eg: "HTTP/1.1 620 Server
 * Standby") and are sent as-is, like a real device does. The official
 * apps silently discard responses formatted like requests (see #25, #59).
 */
export function formatDiscoveryMessage({
    data,
    type,
    version,
}: {
    data?: Record<string, unknown>,
    type: string,
    version: DiscoveryVersion,
}) {
    let formatted = "";
    if (data) {
        for (const key of Object.keys(data)) {
            if (!outgoingDiscoveryKeys.has(key)) continue;
            formatted += `${key}:${data[key]}\n`;
        }
    }

    const firstLine = type.startsWith("HTTP")
        ? type
        : `${type} * HTTP/1.1`;

    return Buffer.from(`${firstLine}\n${formatted}device-discovery-protocol-version:${version}\n`);
}
