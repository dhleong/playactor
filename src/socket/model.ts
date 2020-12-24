export interface ISocketConfig {
    maxRetries: number,
    retryBackoffMillis: number,
}

export const defaultSocketConfig: ISocketConfig = {
    maxRetries: 5,
    retryBackoffMillis: 500,
};
