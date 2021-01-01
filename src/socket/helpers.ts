import { IDeviceSocket, IPacket } from "./model";
import { IResultPacket } from "./packets/base";
import { UnsupportedIncomingPacket } from "./packets/incoming/unsupported";

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

export class RpcError extends Error {
    constructor(
        public readonly result: number,
        public readonly code?: string,
    ) {
        super(`Error[${result}] ${code}`);
    }
}

export async function performRpc<R extends IResultPacket>(
    socket: IDeviceSocket,
    request: IPacket,
    resultType: number,
) {
    await socket.send(request);

    const resultPacket = await receiveType<R>(
        socket,
        resultType,
    );

    if (resultPacket instanceof UnsupportedIncomingPacket) {
        throw new Error(`Unexpectedly received UnsupportedIncomingPacket for ${resultType}`);
    }

    const { errorCode, result } = resultPacket;
    if (result === undefined) {
        throw new Error(`Received packet has no result: ${resultPacket.constructor.name} ${JSON.stringify(resultPacket)}`);
    } else if (result !== 0) {
        throw new RpcError(result, errorCode);
    }

    return resultPacket;
}
