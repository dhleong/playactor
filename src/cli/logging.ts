export interface ILogging {
    logError(error: any): void;
    logInfo(message: string): void;
    logResult(result: any): void;
}
