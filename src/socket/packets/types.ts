export enum PacketType {
    Hello = 0x6f636370,

    LoginResult = 0x07,
    Login = 0x1E,

    ServerStatus = 0x12,
    Status = 0x14,

    Standby = 0x1A,
    StandbyResult = 0x1B,

    Handshake = 0x20,
}
