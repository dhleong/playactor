export enum PacketType {
    Hello = 0x6f636370,

    Bye = 4,
    LoginResultOld = 6,
    LoginResult = 7,
    Login = 30,

    // TODO: screenshots!
    ScreenShot = 8,
    ScreenShotResult = 9,

    Boot = 10,
    BootResult = 11,

    OskStart = 12,
    OskStartResult = 13,
    OskChangeString = 14,
    OskControl = 16,

    ServerStatus = 18,
    Status = 20,

    Standby = 26,
    StandbyResult = 27,

    RemoteControl = 28,

    Handshake = 32,

    // discovered these, but not sure what they do:

    BufferSize = 2,
    BufferSizeResult = 3,

    HttpdStatus = 22,
    ScreenStatus = 24,

    Logout = 34,
    LogoutResult = 35,

    Boot2 = 36,
    BootResult2 = 37,

    ClientAppInfoStatus = 38,

    BootDialogCancel2 = 40,

    CommentViewerStart = 42,
    CommentViewerStartResult = 43,
    CommentViewerNewComment = 44,
    CommentViewerNewCommentHalf = 46,
    CommentViewerEvent = 48,
    CommentViewerEventSendComment = 50,
}
