export enum PassCodeKey {
    Left = 1,
    Up = 2,
    Right = 3,
    Down = 4,
    R1 = 5,
    R2 = 6,
    L1 = 7,
    L2 = 8,
    Triangle = 9,
    Square = 0,
}

const PASSCODE_LENGTH = 4;

const nameToKey = Object.keys(PassCodeKey)
    .reduce((m, key) => {
        // eslint-disable-next-line no-param-reassign
        m[key.toLowerCase()] = (PassCodeKey as any)[key] as PassCodeKey;
        return m;
    }, {} as { [name: string]: PassCodeKey });

/**
 * Given a sequence of passcode keys, convert them into the
 * actual passcode numerical string value for use in ILoginConfig
 */
export function parsePassCodeKeys(...keys: PassCodeKey[]): string {
    if (keys.length !== PASSCODE_LENGTH) {
        throw new Error(`Passcode must have length ${PASSCODE_LENGTH}`);
    }

    let result = "";

    for (const key of keys) {
        result += key;
    }

    return result;
}

/**
 * Given a raw value, which may either be a string of PassCodeKey names
 * or a literal passcode string, return the validated passcode string
 * value, for use in ILoginConfig.
 */
export function parsePassCodeString(input: string) {
    if (/^[0-9]+$/.test(input)) {
        if (input.length !== PASSCODE_LENGTH) {
            throw new Error(`Passcode must be ${PASSCODE_LENGTH} numbers`);
        }

        return input;
    }

    const keys: PassCodeKey[] = [];
    const inputParts = input.split(/[ ]+/);
    for (const part of inputParts) {
        const key = nameToKey[part.toLowerCase()];
        if (key === undefined) {
            throw new Error(`No such passcode key: ${part}`);
        }

        keys.push(key);
    }

    return parsePassCodeKeys(...keys);
}
