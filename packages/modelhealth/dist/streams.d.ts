import type { Activity, Session, Subject, SubjectGroup } from "./types.js";
/**
 * Streams
 *
 * The async-iterable shape every `client.<resource>.list(...)` returns. What to read next,
 * how much is left and when a list is finished are decided in the core layer; this module
 * turns what it hands back into an idiomatic async iterable.
 *
 * @packageDocumentation
 */
/**
 * What a stream reads from. Implemented by the compiled core layer, and by tests.
 *
 * @internal
 */
export interface StreamSource<T> {
    nextItems(): Promise<T[]>;
    total(): Promise<number>;
    cachedTotal(): number | undefined;
    all(): Promise<T[]>;
    free(): void;
}
/**
 * An async-iterable view over a {@link StreamSource}.
 *
 * @internal
 */
export declare class ItemStream<T> implements AsyncIterable<T> {
    private readonly source;
    private held;
    private position;
    private finished;
    private released;
    private knownTotal;
    constructor(source: StreamSource<T>);
    /**
     * The full count of items matching the filter.
     *
     * Remembered once read, so it still answers after the sequence has been read to the end,
     * drained by `all()` or closed. Rejects only if the sequence was closed before anything
     * was read from it, since there is then no count to report and no way to go and find one.
     */
    get total(): Promise<number>;
    /**
     * Returns every remaining matching item, continuing from where reading stopped.
     *
     * After the sequence has been closed this returns what was already in hand rather than
     * reading further — closing says the rest is not wanted.
     */
    all(): Promise<T[]>;
    /**
     * Releases what this stream reads from. Idempotent.
     *
     * Reading to the end releases it. Stopping early deliberately does not, so `all()` still
     * returns what is left afterwards — which is why an early exit is worth closing by hand.
     */
    close(): void;
    [Symbol.asyncIterator](): AsyncIterator<T>;
    /**
     * Keeps the matching count a read has just made available.
     */
    private remember;
    private release;
}
/**
 * An async-iterable sequence of activities matching a filter.
 *
 * Returned by {@link ActivitiesResource.list}:
 *
 * ```typescript
 * for await (const activity of client.activities.list({ tags: ["study-a"] })) {
 *   console.log(activity.name);
 * }
 * ```
 *
 * Read {@link ActivityStream.total} for the number of activities matching the filter, or call
 * {@link ActivityStream.all} to collect what is left into an array.
 */
export interface ActivityStream extends AsyncIterable<Activity> {
    /** The full count of activities matching the filter. */
    readonly total: Promise<number>;
    /** Every remaining matching activity, continuing from where reading stopped. */
    all(): Promise<Activity[]>;
    /**
     * Releases what this sequence reads from. Idempotent.
     *
     * Reading to the end releases it for you. Stopping early deliberately does not, so
     * `all()` still works afterwards — call this once you are done with such a sequence, or
     * leave it to be collected.
     */
    close(): void;
}
/** An async-iterable sequence of subjects matching a filter. See {@link ActivityStream}. */
export interface SubjectStream extends AsyncIterable<Subject> {
    readonly total: Promise<number>;
    all(): Promise<Subject[]>;
    close(): void;
}
/** An async-iterable sequence of sessions matching a filter. See {@link ActivityStream}. */
export interface SessionStream extends AsyncIterable<Session> {
    readonly total: Promise<number>;
    all(): Promise<Session[]>;
    close(): void;
}
/**
 * An async-iterable sequence of subject groups matching a filter. See
 * {@link ActivityStream}.
 */
export interface GroupStream extends AsyncIterable<SubjectGroup> {
    readonly total: Promise<number>;
    all(): Promise<SubjectGroup[]>;
    close(): void;
}
//# sourceMappingURL=streams.d.ts.map