export enum RemoteOperation {
    Up = 1,
    Down = 2,
    Right = 4,
    Left = 8,
    Enter = 16,
    Back = 32,
    Option = 64,
    PS = 128,
    Cancel = 512,
}

export enum InternalRemoteOperation {
    KeyOff = 256,
    CloseRC = 2048,
    OpenRC = 1024,
}
