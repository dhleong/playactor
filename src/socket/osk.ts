export enum OskCommand {
    Close = 1,
    Submit = 0,
}

export enum OskActionType {
    Default = 0,
    Send = 1,
    Search = 2,
    Go = 3,
}

export enum OskInputType {
    Default = 0,
    BasicLatin = 1,
    SimpleNumber = 2,
    ExtendedNumber = 3,
    Url = 4,
    Mail = 5,
}

export enum OskFlags {
    None = 0,
    MultiLine = 0x004,
    Password = 0x008,
    AutoCapitalize = 0x400,
}
