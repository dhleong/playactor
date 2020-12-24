import { IDeviceSocket, IPacket } from "./model";

export async function receiveWhere(
    socket: IDeviceSocket,
    predicate: (packet: IPacket) => boolean,
) {
    for await (const packet of socket.receive()) {
        if (predicate(packet)) {
            return packet;
        }
    }

    throw new Error("Did not receive packet");
}

export async function receiveType<T extends IPacket>(
    socket: IDeviceSocket,
    type: number,
) {
    return await receiveWhere(socket, packet => packet.type === type) as T;
}
