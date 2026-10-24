import { DiscoveryVersion, outgoingDiscoveryKeys } from "./discovery/model";

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
