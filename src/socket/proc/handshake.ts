import _debug from "debug";

import { receiveType } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { ClientHelloPacket } from "../packets/client-hello";
import { ServerHelloPacket } from "../packets/server-hello";
import { PacketType } from "../packets/types";

const debug = _debug("playground:proc:handshake");

export class HandshakeProc implements IDeviceProc {
    public async perform(socket: IDeviceSocket) {
        await socket.send(new ClientHelloPacket(socket.protocolVersion));

        const greeting = await receiveType<ServerHelloPacket>(socket, PacketType.Hello);
        debug("received:", greeting);

        // TODO prepare crypto with the "seed" in `greeting`
        // TODO send the handshake packet
    }
}
