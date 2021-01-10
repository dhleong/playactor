import _debug from "debug";
import NodeRSA from "node-rsa";

import { CryptoCodec } from "../crypto-codec";
import { performRpc } from "../helpers";
import { IDeviceProc, IDeviceSocket } from "../model";
import { ClientHelloPacket } from "../packets/outgoing/client-hello";
import { HandshakePacket } from "../packets/outgoing/handshake";
import { ServerHelloPacket } from "../packets/incoming/server-hello";
import { PacketType } from "../packets/types";

const debug = _debug("playground:proc:handshake");

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxfAO/MDk5ovZpp7xlG9J
JKc4Sg4ztAz+BbOt6Gbhub02tF9bryklpTIyzM0v817pwQ3TCoigpxEcWdTykhDL
cGhAbcp6E7Xh8aHEsqgtQ/c+wY1zIl3fU//uddlB1XuipXthDv6emXsyyU/tJWqc
zy9HCJncLJeYo7MJvf2TE9nnlVm1x4flmD0k1zrvb3MONqoZbKb/TQVuVhBv7SM+
U5PSi3diXIx1Nnj4vQ8clRNUJ5X1tT9XfVmKQS1J513XNZ0uYHYRDzQYujpLWucu
ob7v50wCpUm3iKP1fYCixMP6xFm0jPYz1YQaMV35VkYwc40qgk3av0PDS+1G0dCm
swIDAQAB
-----END PUBLIC KEY-----`;

export class HandshakeProc implements IDeviceProc {
    public async perform(socket: IDeviceSocket) {
        const greeting: ServerHelloPacket = await performRpc(
            socket,
            new ClientHelloPacket(socket.protocolVersion),
            PacketType.Hello,
        );
        debug("received greeting:", greeting);

        // prepare crypto with the "seed" in `greeting`
        const crypto = new CryptoCodec(greeting.seed);

        // sign our "random key" with the public key
        const key = this.signWithPublicKey(crypto.seed);

        await socket.send(new HandshakePacket(key, greeting.seed));

        // set crypto *after* responding with the handshake
        socket.setCodec(crypto);
    }

    // public for testing
    public signWithPublicKey(bytes: Buffer) {
        const publicKey = new NodeRSA(PUBLIC_KEY, "pkcs8-public");
        return publicKey.encrypt(bytes);
    }
}
