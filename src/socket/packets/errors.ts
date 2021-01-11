export const resultsToErrorCodes: {[result: number]: string} = {
    0: "OK",
    1: "BUSY",
    2: "CLIENT_MUST_UPDATE",
    3: "SERVER_OBSOLETE",
    4: "DENIED",
    5: "NO_MEMORY",
    6: "AUTH_FAILURE",
    7: "MAX_USER",
    8: "ALREADY_CONNECTED_SYSCOMP",
    9: "PROHIBITED",
    10: "ALREADY_RUNNING",
    11: "NOT_AUTHENTICATED",
    12: "NO_SUCH_GAME",
    13: "DOWNLOADING",
    14: "INVALID_PARAMETER",
    15: "NO_CLIENT",
    16: "BOOTING",
    17: "ALREADY_CONNECTED_GAMECOMP",
    18: "ANOTHER_USER_IS_ACTIVE",
    19: "OSK_USED_BY_ANOTHER_USER",
    20: "PIN_IS_NEEDED",
    21: "NO_LOCAL_ACCOUNT",
    22: "PASSCODE_IS_NEEDED",
    23: "PIN_IS_UNMATCHED",
    24: "PASSCODE_IS_UNMATCHED",
    25: "STANDBY_IS_DISABLED",
    26: "TOO_MANY_REGISTERED_DEVICES",
    27: "ALREADY_LOGGED_OUT",
    28: "LOGOUT_FAILED",
    30: "LOGIN_MGR_BUSY",
    31: "ANOTHER_GAME_IS_ACTIVE",
    32: "OFFAIR",
};

export function resultToErrorCode(result: number) {
    if (result === 0) return;
    return resultsToErrorCodes[result] ?? "UNKNOWN_ERROR";
}
