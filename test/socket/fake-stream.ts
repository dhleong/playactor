import * as net from "net";

export class FakeStream extends net.Socket {
    public written: any[] = [];

    public write(...args: any[]) {
        const callback = args[args.length - 1];
        this.written.push(args[0]);
        if (typeof callback === "function") callback();
        return true;
    }
}
