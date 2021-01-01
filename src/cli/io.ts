export interface IInputOutput {
    logError(error: any): void;
    logInfo(message: string): void;
    logResult(result: any): void;

    prompt(promptText: string): Promise<string>;
}
