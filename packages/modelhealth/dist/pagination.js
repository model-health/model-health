/**
 * Pagination
 *
 * The shared lazy-iteration engine behind every `client.<resource>.list(...)`
 * method. One implementation, reused per resource via `PaginatedStream<T>` —
 * see `ActivityStream` in `index.ts` for how a resource fixes the element type.
 *
 * @packageDocumentation
 */
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
export class PaginatedStream {
    constructor(fetchPage, limit) {
        this.fetchPage = fetchPage;
        this.buffer = [];
        this.offset = 0;
        this.done = false;
        this.knownTotal = null;
        this.remaining = limit;
    }
    /**
     * The full count of items matching the filter.
     *
     * Awaiting this before iterating forces exactly one page fetch (not a full
     * fetch of everything) if the count isn't already known.
     */
    get total() {
        return this.resolveTotal();
    }
    async resolveTotal() {
        if (this.knownTotal === null && !this.done) {
            await this.fetchNextPage();
        }
        return this.knownTotal ?? 0;
    }
    /**
     * Eagerly fetches and returns every remaining matching item as a real array.
     *
     * Continues from wherever iteration currently is — call this on a
     * freshly-returned stream to materialize everything it matches.
     */
    async all() {
        const items = [];
        for await (const item of this) {
            items.push(item);
        }
        return items;
    }
    /**
     * Fetches one page, buffers its items, and updates the total/offset/done state.
     *
     * Whether a page is the last one is decided by `offset >= total` — the
     * reported total, not the page's own length — so this stays correct even if
     * a page comes back shorter than the requested size for reasons other than
     * being the last page.
     */
    async fetchNextPage() {
        const { items, total } = await this.fetchPage(this.offset);
        this.knownTotal = total;
        this.offset += items.length;
        if (items.length === 0 || this.offset >= total) {
            this.done = true;
        }
        this.buffer.push(...items);
    }
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
    async *iterate() {
        for (;;) {
            if (this.remaining !== null && this.remaining <= 0) {
                return;
            }
            if (this.buffer.length === 0) {
                if (this.done) {
                    return;
                }
                await this.fetchNextPage();
                if (this.buffer.length === 0) {
                    return;
                }
            }
            const item = this.buffer.shift();
            if (this.remaining !== null) {
                this.remaining -= 1;
            }
            yield item;
        }
    }
}
//# sourceMappingURL=pagination.js.map