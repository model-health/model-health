import { ModelHealthError } from "./errors.js";
/**
 * Releases sources whose stream was dropped without being read to the end.
 *
 * A stream owns what it reads from, and nothing releases that on its own. Normal iteration
 * and an explicit `close()` both release it promptly; this is the net for the case where a
 * caller simply stops referring to the stream. Registered per source, so releasing twice is
 * impossible — the registry never fires for a source already released.
 */
const abandoned = typeof FinalizationRegistry === "undefined"
    ? undefined
    : new FinalizationRegistry((source) => {
        source.free();
    });
/**
 * An async-iterable view over a {@link StreamSource}.
 *
 * @internal
 */
export class ItemStream {
    constructor(source) {
        this.source = source;
        this.held = [];
        this.position = 0;
        this.finished = false;
        this.released = false;
        this.knownTotal = null;
        abandoned?.register(this, source, this);
    }
    /**
     * The full count of items matching the filter.
     *
     * Remembered once read, so it still answers after the sequence has been read to the end,
     * drained by `all()` or closed. Rejects only if the sequence was closed before anything
     * was read from it, since there is then no count to report and no way to go and find one.
     */
    get total() {
        if (this.released) {
            return this.knownTotal === null
                ? Promise.reject(new ModelHealthError("this sequence was closed before anything was read from it, so the matching count is not known"))
                : Promise.resolve(this.knownTotal);
        }
        return this.source.total().then((total) => {
            this.knownTotal = total;
            return total;
        });
    }
    /**
     * Returns every remaining matching item, continuing from where reading stopped.
     *
     * After the sequence has been closed this returns what was already in hand rather than
     * reading further — closing says the rest is not wanted.
     */
    async all() {
        const held = this.held.slice(this.position);
        this.held = [];
        this.position = 0;
        if (this.finished || this.released) {
            this.finished = true;
            return held;
        }
        const rest = await this.source.all();
        this.finished = true;
        this.remember();
        this.release();
        return [...held, ...rest];
    }
    /**
     * Releases what this stream reads from. Idempotent.
     *
     * Reading to the end releases it. Stopping early deliberately does not, so `all()` still
     * returns what is left afterwards — which is why an early exit is worth closing by hand.
     */
    close() {
        this.release();
    }
    async *[Symbol.asyncIterator]() {
        try {
            for (;;) {
                if (this.position < this.held.length) {
                    yield this.held[this.position++];
                    continue;
                }
                if (this.finished || this.released) {
                    return;
                }
                this.held = await this.source.nextItems();
                this.remember();
                this.position = 0;
                if (this.held.length === 0) {
                    this.finished = true;
                    return;
                }
            }
        }
        finally {
            // Reached on a `break` as well as on normal completion: a `for await` loop that exits
            // early resumes the generator here before discarding it.
            if (this.finished) {
                this.release();
            }
        }
    }
    /**
     * Keeps the matching count a read has just made available.
     */
    remember() {
        const total = this.source.cachedTotal();
        if (total !== undefined) {
            this.knownTotal = total;
        }
    }
    release() {
        if (this.released) {
            return;
        }
        this.released = true;
        abandoned?.unregister(this);
        this.source.free();
    }
}
//# sourceMappingURL=streams.js.map