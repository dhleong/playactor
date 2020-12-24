import { receiveType } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { ClientHelloPacket } from "../packets/client-hello";
import { PacketType } from "../packets/types";

export class HandshakeProc implements IDeviceProc {
    public async perform(socket: IDeviceSocket) {
        await socket.send(new ClientHelloPacket(socket.protocolVersion));

        // TODO: receive as ServerHelloPacket
        /* const greeting = */ await receiveType(socket, PacketType.Hello);

        // TODO prepare crypto with the "seed" in `greeting`
        // TODO send the handshake packet
    }
}
