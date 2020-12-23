import { AsyncSink } from "ix/asynciterable/asyncsink";

/**
 * Drop-in replacement for AsyncSink that also handles early cancellation,
 * calling the function installed in onCancel.
 */
export class CancellableAsyncSink<T> implements AsyncIterator<T>, AsyncIterable<T> {
    private readonly sink = new AsyncSink<T>();

    public onCancel?: () => void;

    public end(error?: Error) {
        if (error) this.sink.error(error);
        else this.sink.end();
    }

    public next() {
        return this.sink.next();
    }

    public async return(value: T) {
        const onCancel = this.onCancel;
        if (onCancel) onCancel();

        return {
            value,
            done: true,
        };
    }

    public write(value: T) {
        this.sink.write(value);
    }

    public [Symbol.asyncIterator]() {
        return this;
    }
}
