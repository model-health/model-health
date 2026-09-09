/**
 * Pagination
 *
 * The shared lazy-iteration engine behind every `client.<resource>.list(...)`
 * method. One implementation, reused per resource via `PaginatedStream<T>` —
 * see `ActivityStream` in `index.ts` for how a resource fixes the element type.
 *
 * @packageDocumentation
 */
/** One fetched page: its items alongside the full matching-result total. */
interface Page<T> {
    items: T[];
    total: number;
}
/** Fetches one page at the given offset. Stateless — callable repeatedly. */
type FetchPage<T> = (offset: number) => Promise<Page<T>>;
/**
 * A lazily-paginated, async-iterable sequence of resources.
 *
 * Not constructed directly — every resource's `.list(...)` returns a stream that
 * fixes the element type (see {@link ActivityStream}). Iterate it directly with
 * `for await` — pages are fetched transparently, one at a time, as you consume it:
 *
 * ```typescript
 * for await (const activity of client.activities.list({ tags: ["study-a"] })) {
 *   console.log(activity.name);
 * }
 * ```
 *
 * Read {@link PaginatedStream.total} for the full matching-result count without
 * iterating everything, or call {@link PaginatedStream.all} to eagerly collect
 * every remaining matching item into an array.
 */
export declare class PaginatedStream<T> implements AsyncIterable<T> {
    private readonly fetchPage;
    private buffer;
    private offset;
    private done;
    private knownTotal;
    private remaining;
    constructor(fetchPage: FetchPage<T>, limit: number | null);
    /**
     * The full count of items matching the filter.
     *
     * Awaiting this before iterating forces exactly one page fetch (not a full
     * fetch of everything) if the count isn't already known.
     */
    get total(): Promise<number>;
    private resolveTotal;
    /**
     * Eagerly fetches and returns every remaining matching item as a real array.
     *
     * Continues from wherever iteration currently is — call this on a
     * freshly-returned stream to materialize everything it matches.
     */
    all(): Promise<T[]>;
    /**
     * Fetches one page, buffers its items, and updates the total/offset/done state.
     *
     * Whether a page is the last one is decided by `offset >= total` — the
     * reported total, not the page's own length — so this stays correct even if
     * a page comes back shorter than the requested size for reasons other than
     * being the last page.
     */
    private fetchNextPage;
    [Symbol.asyncIterator](): AsyncIterator<T>;
    private iterate;
}
export {};
//# sourceMappingURL=pagination.d.ts.map