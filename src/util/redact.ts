import debug from "debug";

const keysToRedact = new Set([
    "AP-Bssid",
    "host-id",
    "deviceHostId",
    "passCode",
    "Np-AccountId",
    "PS5-Mac",
    "PS5-RegistKey",
    "RP-RegistKey",
    "RP-Key",
]);

function redactString(s: string) {
    return "█".repeat(s.length);
}

function redactBuffer(b: Buffer) {
    return `<Buffer (${b.length} bytes) ${redactString("REDACTED")}>`;
}

function redactRecord(record: Record<string, unknown>) {
    return Object.keys(record).reduce((m, key) => {
        const value = m[key];
        if (value && typeof value === "string" && keysToRedact.has(key)) {
            // eslint-disable-next-line no-param-reassign
            m[key] = redactString(value);
        } else if (value && typeof value === "object") {
            // eslint-disable-next-line no-param-reassign
            m[key] = redactRecord(value as Record<string, unknown>);
        }
        return m;
    }, record);
}

/**
 * Redact a value, unless we've explicitly requested that values be printed
 * unredacted. For maps/records, we will ONLY redact specific keys (but nested
 * records will also have redact() called on them); string values passed in
 * will always be completely redacted.  Arrays will have redact() called on
 * each value.
 */
export function redact(value: string): string;
export function redact(value: Buffer): string;
export function redact(value: Record<string, unknown>): Record<string, unknown>;
export function redact(value: object): object;  // eslint-disable-line
export function redact<T>(value: T[]): T[];
export function redact(value: unknown): unknown {
    if (debug.enabled("playactor-unredacted")) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(redact);
    }

    if (typeof value === "string") {
        return redactString(value);
    }

    if (Buffer.isBuffer(value)) {
        return redactBuffer(value);
    }

    if (typeof value === "object" && value != null) {
        return redactRecord(value as Record<string, unknown>);
    }

    return value;
}
