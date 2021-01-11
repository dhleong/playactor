export enum PacketType {
    Hello = 0x6f636370,

    Bye = 0x04,
    LoginResult = 0x07,
    Login = 0x1E,

    Boot = 0x0a,
    BootResult = 0x0b,

    OskChangeString = 0x0e,
    OskControl = 0x10,
    OskStart = 0x0c,
    OskStartResult = 0x0d,

    ServerStatus = 0x12,
    Status = 0x14,

    Standby = 0x1A,
    StandbyResult = 0x1B,

    RemoteControl = 0x1C,

    Handshake = 0x20,
}
