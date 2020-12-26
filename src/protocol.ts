import { ICredentials } from "./credentials/model";

export const DiscoveryVersions = {
    PS4: "00020020",
    PS5: "00030010",
} as const;

export type DiscoveryVersion = typeof DiscoveryVersions[keyof typeof DiscoveryVersions];

export function formatDiscoveryMessage({
    data,
    type,
    version,
}: {
    data?: Record<string, unknown> | ICredentials,
    type: string,
    version: DiscoveryVersion,
}) {
    const formatted = data
        ? Object.keys(data).reduce(
            (last, key) => `${last}${key}:${(data as any)[key]}\n`,
            "",
        ) : "";

    return Buffer.from(`${type} * HTTP/1.1\n${formatted}device-discovery-protocol-version:${version}\n`);
}
