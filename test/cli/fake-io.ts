import { IInputOutput } from "../../src/cli/io";

export class FakeIO implements IInputOutput {
    public pendingPromptResponse?: string;

    public logError(): void { /* nop */ }
    public logInfo(): void { /* nop */ }
    public logResult(): void { /* nop */ }

    public async prompt() {
        if (this.pendingPromptResponse) {
            return this.pendingPromptResponse;
        }

        throw new Error("No prompt set");
    }
}
