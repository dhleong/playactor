import { ExpectedError } from "clime";
import { parsePassCodeString } from "../credentials/pass-code";

export class CliPassCode {
    public static cast(input: string) {
        try {
            return new CliPassCode(parsePassCodeString(input));
        } catch (e) {
            if (e instanceof Error) {
                throw new ExpectedError(e.message);
            } else {
                throw new ExpectedError(`${e}`);
            }
        }
    }

    constructor(
        public readonly value: string,
    ) {}
}
