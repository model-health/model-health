/**
 * Model Health SDK Client
 *
 * TypeScript/JavaScript client for the Model Health biomechanics SDK.
 * Provides a clean, typed API over the WASM bindings.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```typescript
 * import { ModelHealthClient } from '@modelhealth/modelhealth';
 *
 * const client = new ModelHealthClient({ apiKey: 'your-api-key' });
 * await client.init();
 *
 * const sessions = await client.sessionList();
 * ```
 */
import { ModelHealthError, mapModelHealthError } from "./errors.js";
import { ItemStream } from "./streams.js";
let wasmModule = null;
let wasmInitialized = false;
let wasmInitPromise = null;
/**
 * Wrap every method on the raw WASM client so a thrown WASM error is reconstructed into
 * the specific `ModelHealthError` subclass (see `./errors.ts`) instead of surfacing as
 * whatever wasm-bindgen produced. This is the single chokepoint for all `wasmClient` calls —
 * individual SDK methods don't need their own try/catch.
 */
function wrapWasmErrors(client) {
    return new Proxy(client, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value !== "function") {
                return value;
            }
            return function (...args) {
                try {
                    const result = value.apply(target, args);
                    if (result instanceof Promise) {
                        return result.catch((err) => {
                            throw mapModelHealthError(err);
                        });
                    }
                    return result;
                }
                catch (err) {
                    throw mapModelHealthError(err);
                }
            };
        },
    });
}
/**
 * Initialize the WASM module.
 *
 * This must be called before using the SDK. It loads and initializes
 * the WebAssembly module containing the core SDK functionality.
 *
 * @internal
 */
async function initWasm() {
    if (wasmInitialized)
        return;
    if (wasmInitPromise)
        return wasmInitPromise;
    wasmInitPromise = (async () => {
        try {
            wasmModule = await import("../wasm/model_health_wasm.js");
            // Node.js fetch() does not support file:// URLs, so we read the .wasm
            // bytes from disk and pass the buffer directly to the init function.
            const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);
            if (isNode) {
                const { readFile } = await import("fs/promises");
                const { fileURLToPath } = await import("url");
                const wasmUrl = new URL("../wasm/model_health_wasm_bg.wasm", import.meta.url);
                const wasmBytes = await readFile(fileURLToPath(wasmUrl));
                await wasmModule.default({ module_or_path: wasmBytes.buffer });
            }
            else {
                await wasmModule.default();
            }
            wasmInitialized = true;
        }
        catch (error) {
            wasmInitPromise = null;
            throw new Error(`Failed to initialize WASM module: ${error}`);
        }
    })();
    return wasmInitPromise;
}
// MARK: - Telemetry Detection
/** @internal */
function detectRuntime() {
    return typeof window !== "undefined" ? "browser" : "node";
}
/** @internal */
function detectNodeVersion() {
    return typeof process !== "undefined" ? process.version : undefined;
}
/**
 * Host OS family, e.g. `"macos"`, `"linux"`, `"windows"`. Node's `process.platform`
 * is reliable; a browser only exposes it via `navigator.userAgentData.platform`
 * (Chromium-only) or the older, deprecated `navigator.platform` — both best-effort,
 * like {@link detectBrowser}.
 * @internal
 */
function detectPlatform(runtime) {
    if (runtime === "node") {
        if (typeof process === "undefined")
            return undefined;
        const nodePlatformMap = { darwin: "macos", win32: "windows" };
        return nodePlatformMap[process.platform] ?? process.platform;
    }
    if (typeof navigator === "undefined")
        return undefined;
    const raw = navigator.userAgentData?.platform ?? navigator.platform;
    if (!raw)
        return undefined;
    const normalized = raw.toLowerCase();
    if (normalized.includes("mac"))
        return "macos";
    if (normalized.includes("win"))
        return "windows";
    if (normalized.includes("linux"))
        return "linux";
    if (normalized.includes("iphone") || normalized.includes("ipad"))
        return "ios";
    if (normalized.includes("android"))
        return "android";
    return normalized;
}
/**
 * Browser name/version, best-effort. Prefers the User-Agent Client Hints API
 * (`navigator.userAgentData`, Chromium-only) and falls back to a small `navigator.userAgent`
 * regex for Safari/Firefox, which don't support Client Hints. Inherently fragile and
 * spoofable — treated as a coarse signal, not a source of truth.
 * @internal
 */
function detectBrowser() {
    if (typeof navigator === "undefined")
        return {};
    const uaData = navigator.userAgentData;
    const brands = uaData?.brands;
    if (brands?.length) {
        const brand = brands.find((b) => !/not.a.brand/i.test(b.brand)) ?? brands[0];
        return { browser: brand.brand.toLowerCase(), version: brand.version };
    }
    const ua = navigator.userAgent ?? "";
    const patterns = [
        ["edge", /edg\/([\d.]+)/i],
        ["chrome", /chrome\/([\d.]+)/i],
        ["firefox", /firefox\/([\d.]+)/i],
        ["safari", /version\/([\d.]+).*safari/i],
    ];
    for (const [name, pattern] of patterns) {
        const match = ua.match(pattern);
        if (match)
            return { browser: name, version: match[1] };
    }
    return ua ? { browser: "other" } : {};
}
/**
 * OS version string. Only reliably available in Node (`os.release()`) — browsers don't
 * expose a trustworthy OS version, so this resolves to undefined there.
 * @internal
 */
async function detectOsVersion() {
    if (typeof process === "undefined" || !process.versions?.node)
        return undefined;
    try {
        const os = await import("os");
        return os.release();
    }
    catch {
        return undefined;
    }
}
// MARK: - API Key Resolution
/**
 * Applies the development-only key override, if this is a development build.
 *
 * Gathers the raw inputs available in Node — the `MODEL_HEALTH_API_KEY` environment value and
 * the verbatim contents of a `.env` file in the working directory — and hands them to the
 * shared Rust resolver, which decides which one wins. No precedence logic and no `.env`
 * parsing lives here; the same function serves every binding.
 *
 * In a production build `isDevelopmentBuild()` is false and the `resolveApiKey` export does
 * not exist, so the key is returned exactly as given. A browser has no `process.env` and no
 * filesystem, so nothing is gathered there either.
 * @internal
 */
async function applyDevKeyOverride(explicit) {
    if (!wasmModule?.isDevelopmentBuild?.())
        return explicit;
    const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);
    if (!isNode)
        return explicit;
    const envValue = process.env.MODEL_HEALTH_API_KEY;
    let dotEnvContents;
    try {
        const { readFile } = await import("fs/promises");
        const path = await import("path");
        dotEnvContents = await readFile(path.join(process.cwd(), ".env"), "utf-8");
    }
    catch {
        dotEnvContents = undefined; // no .env, or unreadable — not an error
    }
    return wasmModule.resolveApiKey(explicit, envValue, dotEnvContents);
}
// MARK: - Key Transformation Utilities
/**
 * Convert a single snake_case string to camelCase.
 * @internal
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
/**
 * Convert a single camelCase string to snake_case.
 * @internal
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
/**
 * Recursively convert all object keys from snake_case to camelCase.
 * Used to normalize WASM responses to idiomatic TypeScript.
 * @internal
 */
function camelizeKeys(value) {
    if (Array.isArray(value))
        return value.map(camelizeKeys);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [
            snakeToCamel(k),
            camelizeKeys(v),
        ]));
    }
    return value;
}
/**
 * The filter behind every way of listing activities.
 *
 * Shared by `client.activities.list(...)` and by the links a record carries, so all of
 * them accept the same spellings and send the same shape.
 * @internal
 */
function activityFilterFrom(options) {
    const activityType = activityTypeFilter(options.activityType);
    const activityTypes = activityTypesFilter(options.activityTypes);
    const excludeCalibration = options.excludeCalibration ?? true;
    return {
        subject_id: options.subject === undefined ? undefined : subjectIdOf(options.subject, "subject"),
        subject_ids: subjectIdsFilter(options.subjects),
        calibration_session_id: typeof options.calibrationSession === "object" ? options.calibrationSession.id : options.calibrationSession,
        session_id: typeof options.session === "object" ? options.session.id : options.session,
        activity_type: activityType.name,
        activity_type_id: activityType.id,
        activity_types: activityTypes.names,
        activity_type_ids: activityTypes.ids,
        exclude_calibrate: excludeCalibration,
        exclude_neutral: excludeCalibration,
        created_after: formatFilterDate(options.createdAfter),
        created_before: formatFilterDate(options.createdBefore),
        search: options.search,
        tags: options.tags,
        created_by: options.createdBy,
        only_completed: options.onlyCompleted ?? false,
        exclude_analysis_error: options.excludeAnalysisError ?? false,
    };
}
/**
 * The filter behind every way of listing sessions.
 *
 * Shared by `client.sessions.list(...)` and by `subject.sessions(...)`, so both accept
 * the same spellings and send the same shape.
 * @internal
 */
function sessionFilterFrom(options) {
    return {
        subject_id: typeof options.subject === "object" ? options.subject.id : options.subject,
    };
}
/**
 * Hangs a member on a model without it counting as one of the model's fields.
 *
 * A record is handed back as plain data, and anything that walks its own properties —
 * sending it onward, serialising it, copying it — must see the fields and nothing else.
 * A non-enumerable member is invisible to all of those, which is what lets a record
 * carry its links without them travelling as data.
 * @internal
 */
function hide(target, name, value) {
    Object.defineProperty(target, name, { value, enumerable: false, configurable: true });
}
/**
 * Field names that carry an ISO-8601 timestamp anywhere in a response, converted to
 * `Date` in place.
 * @internal
 */
const DATE_FIELDS = ["createdAt", "updatedAt", "lastActivity", "trashedAt", "periodEnd"];
/**
 * Recursively converts known timestamp fields found anywhere in the response tree to
 * `Date`, in place.
 *
 * A field is skipped if it isn't a string, or doesn't parse as a valid date — nothing
 * here throws.
 *
 * `Date` only has millisecond resolution, so a timestamp with microseconds
 * (`"...804362Z"`) loses precision (`"...804Z"`) — a JS platform limit, not something
 * this function can avoid.
 * @internal
 */
function parseDates(value) {
    if (Array.isArray(value))
        return value.map(parseDates);
    if (value !== null && typeof value === "object") {
        const obj = value;
        for (const key of DATE_FIELDS) {
            const raw = obj[key];
            if (typeof raw === "string") {
                const date = new Date(raw);
                if (!Number.isNaN(date.getTime())) {
                    obj[key] = date;
                }
            }
        }
        for (const v of Object.values(obj)) {
            parseDates(v);
        }
    }
    return value;
}
/**
 * Recursively convert all object keys from camelCase to snake_case.
 * Used to convert TypeScript inputs back to the format expected by the WASM layer.
 *
 * `Date` is serialized to its ISO-8601 string before the generic object branch would
 * otherwise flatten it to `{}` — `Object.entries(new Date())` is `[]`, since a `Date`
 * stores its value internally rather than as an enumerable own property. Without this,
 * any response object obtained from the SDK (whose date fields are converted to `Date`
 * in place by `parseDates`) would fail to round-trip through
 * `calibrateSubject`/`importSession`: the `Date` field arrives at core as `{}`, which
 * fails to deserialize as an RFC-3339 timestamp.
 * @internal
 */
function decamelizeKeys(value) {
    if (value instanceof Date)
        return value.toISOString();
    if (Array.isArray(value))
        return value.map(decamelizeKeys);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [
            camelToSnake(k),
            decamelizeKeys(v),
        ]));
    }
    return value;
}
/**
 * Formats a filter date param as a bare `YYYY-MM-DD` string, the shape every
 * date-range filter expects.
 *
 * Read off the date's own components rather than through `toISOString()`, which
 * would answer in UTC: `new Date(2025, 0, 1)` is written to mean the first of
 * January, and east of UTC that instant lands on the previous day — so the
 * filter would quietly start a day early, with a well-formed date nothing
 * downstream could object to.
 * @internal
 */
/**
 * Splits an activity-type filter into the name to send and the id to resolve.
 *
 * A caller holding the whole record costs nothing; one holding a bare id has it looked
 * up against the account's types before the request goes out.
 * @internal
 */
function activityTypeFilter(value) {
    return value === undefined ? {} : activityTypeOf(value, "activityType");
}
/**
 * Reduces one activity type, or its id, to the name to send or the id to resolve.
 * @internal
 */
function activityTypeOf(value, option) {
    if (typeof value === "number" && Number.isInteger(value)) {
        return { id: value };
    }
    if (value !== null && typeof value === "object" && typeof value.name === "string") {
        return { name: value.name };
    }
    throw new TypeError(`${option} takes a type from client.activityTypes(), or its id; got ${String(value)}`);
}
/**
 * Splits several activity types into the names to send and the ids to resolve.
 *
 * As {@link activityTypeFilter}, for a list. An empty list is refused here rather than
 * read as every type.
 * @internal
 */
function activityTypesFilter(values) {
    if (values === undefined) {
        return {};
    }
    if (!Array.isArray(values)) {
        throw new TypeError("activityTypes takes an array; use activityType for a single type");
    }
    if (values.length === 0) {
        throw new TypeError("activityTypes must not be empty; omit it to match every type");
    }
    const names = [];
    const ids = [];
    for (const value of values) {
        const { name, id } = activityTypeOf(value, "activityTypes");
        if (name !== undefined) {
            names.push(name);
        }
        else if (id !== undefined) {
            ids.push(id);
        }
    }
    return {
        names: names.length > 0 ? names : undefined,
        ids: ids.length > 0 ? ids : undefined,
    };
}
/**
 * Reduces a subject, or its id, to the id to send.
 * @internal
 */
function subjectIdOf(value, option) {
    if (typeof value === "number" && Number.isInteger(value)) {
        return value;
    }
    if (value !== null && typeof value === "object" && typeof value.id === "number") {
        return value.id;
    }
    throw new TypeError(`${option} takes subjects from client.subjects.list(), or their ids; got ${String(value)}`);
}
/**
 * Reduces several subjects, or their ids, to the ids to send. An empty list is refused
 * here rather than read as every subject.
 * @internal
 */
function subjectIdsFilter(values) {
    if (values === undefined) {
        return undefined;
    }
    if (!Array.isArray(values)) {
        throw new TypeError("subjects takes an array; use subject for a single subject");
    }
    if (values.length === 0) {
        throw new TypeError("subjects must not be empty; omit it to match every subject");
    }
    return values.map((value) => subjectIdOf(value, "subjects"));
}
function formatFilterDate(value) {
    if (value === undefined || typeof value === "string") {
        return value;
    }
    const pad = (part) => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
/**
 * Converts a customer-facing `orderBy` value (camelCase, optionally `-`-prefixed)
 * to the snake_case field name the core layer validates against.
 * @internal
 */
function formatOrderBy(orderBy) {
    if (orderBy === undefined)
        return undefined;
    return orderBy.startsWith("-") ? `-${camelToSnake(orderBy.slice(1))}` : camelToSnake(orderBy);
}
/**
 * Model Health SDK Client for biomechanical analysis.
 *
 * Main entry point for interacting with the Model Health SDK.
 * Provides authentication, session management, data download,
 * and analysis capabilities.
 *
 * @example
 * ```typescript
 * const client = new ModelHealthClient({ apiKey: 'your-api-key' });
 * await client.init();
 *
 * const sessions = await client.sessionList();
 * ```
 *
 * @example With an explicit key and custom configuration
 * ```typescript
 * const client = new ModelHealthClient({
 *   apiKey: "your-api-key",
 *   timeout: 10,
 *   maxRetries: 1,
 * });
 * await client.init();
 * ```
 */
/**
 * Filtered access to activities.
 *
 * Returned by {@link ModelHealthClient.activities} — do not construct directly.
 */
export class ActivitiesResource {
    /** @internal */
    constructor(client) {
        this.client = client;
    }
    /**
     * Lazily lists activities matching the given filters.
     *
     * @example
     * ```typescript
     * const activities = client.activities.list({
     *   subject,
     *   activityType: ActivityType.Squats,
     *   createdAfter: new Date("2026-01-01"),
     *   orderBy: "-createdAt",
     * });
     * for await (const activity of activities) {
     *   console.log(activity.name);
     * }
     *
     * const total = await client.activities.list({ tags: ["study-a"] }).total;
     * const all = await client.activities.list({ tags: ["study-a"] }).all();
     *
     * // Several subjects and types in one request. Pick a handful: every one is sent in
     * // the request, so a whole account's worth would not fit. To match everything,
     * // leave the filters out.
     * const [alice, bob] = await client.subjects.list({ limit: 2 }).all();
     * const [squats, hops] = (await client.activityTypes()).slice(0, 2);
     * for await (const activity of client.activities.list({
     *   subjects: [alice, bob],
     *   activityTypes: [squats, hops],
     * })) {
     *   console.log(activity.subjectInfo?.name, activity.name);
     * }
     * ```
     */
    list(options = {}) {
        return this.client._activitiesStream(activityFilterFrom(options), formatOrderBy(options.orderBy), options.limit);
    }
}
/**
 * Filtered access to subjects.
 *
 * Returned by {@link ModelHealthClient.subjects} — do not construct directly.
 */
export class SubjectsResource {
    /** @internal */
    constructor(client) {
        this.client = client;
    }
    /**
     * The subject with exactly this name, or `undefined` when nobody has it.
     *
     * `search` on {@link SubjectsResource.list} narrows by substring; this matches the
     * whole name, ignoring case. A prefix is not a name, and no match is `undefined`
     * rather than an error.
     *
     * @param name The subject's full name.
     * @returns The subject, or `undefined` when nobody has this name.
     * @throws {AmbiguousMatchError} When more than one subject has this name — the message
     *   lists their ids, so you can pick one with {@link ModelHealthClient.fetchSubject}.
     *   A blank name is refused before anything is sent.
     *
     * @example
     * ```typescript
     * const subject = await client.subjects.find("Antoine Falisse");
     * if (subject) {
     *   for await (const activity of subject.activities()) console.log(activity.name);
     * }
     * ```
     */
    async find(name) {
        return this.client._findSubject(name);
    }
    /**
     * Lazily lists subjects matching the given filters.
     *
     * @example
     * ```typescript
     * const subjects = client.subjects.list({ search: "Falisse", tags: ["study-a"] });
     * for await (const subject of subjects) {
     *   console.log(subject.name);
     * }
     *
     * const total = await client.subjects.list({ tags: ["study-a"] }).total;
     * const all = await client.subjects.list({ tags: ["study-a"] }).all();
     * ```
     */
    list(options = {}) {
        const sessionId = typeof options.session === "object" ? options.session.id : options.session;
        const createdAfter = formatFilterDate(options.createdAfter);
        const createdBefore = formatFilterDate(options.createdBefore);
        const orderBy = formatOrderBy(options.orderBy);
        const activityType = activityTypeFilter(options.activityType);
        return this.client._subjectsStream({
            search: options.search,
            created_after: createdAfter,
            created_before: createdBefore,
            groups: options.groups,
            tags: options.tags,
            created_by: options.createdBy,
            activity_type: activityType.name,
            activity_type_id: activityType.id,
            activity_complete: options.activityComplete,
            session_id: sessionId,
        }, orderBy, options.limit);
    }
}
/**
 * Filtered access to sessions.
 *
 * Returned by {@link ModelHealthClient.sessions} — do not construct directly.
 */
export class SessionsResource {
    /** @internal */
    constructor(client) {
        this.client = client;
    }
    /**
     * Lazily lists sessions matching the given filters.
     *
     * @example
     * ```typescript
     * for await (const session of client.sessions.list({ subject })) {
     *   console.log(session.id);
     * }
     *
     * const total = await client.sessions.list({ subject }).total;
     * ```
     */
    list(options = {}) {
        return this.client._sessionsStream(sessionFilterFrom(options), formatOrderBy(options.orderBy), options.limit);
    }
}
/**
 * Filtered access to subject groups.
 *
 * Returned by {@link ModelHealthClient.groups} — do not construct directly.
 */
export class GroupsResource {
    /** @internal */
    constructor(client) {
        this.client = client;
    }
    /**
     * Lazily lists subject groups matching the given filters.
     *
     * @example
     * ```typescript
     * for await (const group of client.groups.list({ search: "cohort" })) {
     *   console.log(group.name);
     * }
     *
     * const total = await client.groups.list().total;
     * ```
     */
    list(options = {}) {
        const orderBy = formatOrderBy(options.orderBy);
        return this.client._groupsStream({ search: options.search }, orderBy, options.limit);
    }
}
export class ModelHealthClient {
    /**
     * Create a new Model Health client.
     *
     * @param config Configuration options. `apiKey` is required.
     * @throws If the API key is empty.
     *
     * @example
     * ```typescript
     * const client = new ModelHealthClient({ apiKey: "your-api-key" });
     * ```
     *
     * @example Custom configuration
     * ```typescript
     * const client = new ModelHealthClient({
     *   apiKey: "your-api-key",
     *   timeout: 10,
     *   maxRetries: 1,
     *   autoInit: false,
     * });
     * ```
     */
    constructor(config) {
        this.wasmClient = null;
        this.initialized = false;
        /**
         * Failure from a background `init()` started by `autoInit`, kept so the original
         * error can be re-thrown from {@link ModelHealthClient.ensureInitialized} instead
         * of a generic "not initialized" message.
         */
        this.initError = null;
        /**
         * Hangs a subject's links on it, so a record read through this client can reach the
         * records next to it. The links are not fields — see {@link hide}.
         */
        this.bindSubject = (subject) => {
            hide(subject, "sessions", (options = {}) => this.subjectSessions(subject.id, options));
            hide(subject, "activities", (options = {}) => this.subjectActivities(subject.id, options));
            hide(subject, "refresh", async () => this.parseResponse(await this.wasmClient.refreshSubject(subject.id), this.bindSubject));
            hide(subject, "equals", (other) => other?.id === subject.id);
            hide(subject, "toString", () => wasmModule.describeSubject(subject.id, subject.name));
        };
        this.bindSession = (session) => {
            for (const activity of session.embeddedActivities ?? [])
                this.bindActivity(activity);
            hide(session, "subject", async () => this.parseResponse(await this.wasmClient.subjectOfSession(session.subjectId ?? undefined), this.bindSubject));
            hide(session, "activities", (options = {}) => this.sessionActivities(session.id, options));
            hide(session, "refresh", async () => this.parseResponse(await this.wasmClient.refreshSession(session.id), this.bindSession));
            hide(session, "equals", (other) => other?.id === session.id);
            hide(session, "toString", () => wasmModule.describeSession(session.id, session.name));
        };
        this.bindActivity = (activity) => {
            hide(activity, "session", async () => this.parseResponse(await this.wasmClient.sessionOfActivity(activity.sessionId), this.bindSession));
            hide(activity, "subject", async () => this.parseResponse(await this.wasmClient.subjectOfActivity(activity.sessionId), this.bindSubject));
            hide(activity, "refresh", async () => this.parseResponse(await this.wasmClient.refreshActivity(activity.id), this.bindActivity));
            hide(activity, "equals", (other) => other?.id === activity.id);
            Object.defineProperty(activity, "hasResults", {
                get: () => {
                    try {
                        return wasmModule.activityHasResults(decamelizeKeys(activity));
                    }
                    catch (err) {
                        throw mapModelHealthError(err);
                    }
                },
                enumerable: false,
                configurable: true,
            });
            hide(activity, "toString", () => wasmModule.describeActivity(activity.id, activity.name));
        };
        if (!config.apiKey) {
            throw new ModelHealthError("An API key is required. Pass apiKey in the config.");
        }
        this.config = {
            apiKey: config.apiKey,
            // Left undefined when omitted so the core picks the build's default — hardcoding
            // a value here would make the development build's 60s timeout unreachable.
            timeout: config.timeout,
            maxRetries: config.maxRetries,
            autoInit: config.autoInit ?? true,
        };
        this.activities = new ActivitiesResource(this);
        this.subjects = new SubjectsResource(this);
        this.sessions = new SessionsResource(this);
        this.groups = new GroupsResource(this);
        // Auto-initialize if requested. The rejection is retained (not just logged) so the
        // real cause — e.g. a WASM load failure — surfaces from the first method
        // call instead of being replaced by a generic "not initialized" error.
        if (this.config.autoInit) {
            this.init().catch((error) => {
                this.initError = error;
                console.error("Failed to auto-initialize Model Health client:", error);
            });
        }
    }
    /**
     * Initialize the WASM module and client.
     *
     * Must be called before using any other methods if `autoInit: false`
     * was specified in the configuration. Safe to call multiple times.
     *
     * @throws If WASM initialization fails.
     *
     * @example
     * ```typescript
     * const client = new ModelHealthClient({ apiKey: "your-api-key", autoInit: false });
     * await client.init();
     * ```
     */
    async init() {
        if (this.initialized)
            return;
        await initWasm();
        // No-op in a production build; see `applyDevKeyOverride`.
        this.config.apiKey = await applyDevKeyOverride(this.config.apiKey);
        // Create the WASM client with API key + transport config. The telemetry-related
        // arguments are best-effort environment detection used only for a one-shot
        // "SDK initialized" beacon.
        try {
            const runtime = detectRuntime();
            const platform = detectPlatform(runtime);
            const runtimeVersion = runtime === "node" ? detectNodeVersion() : detectBrowser().version;
            const browser = runtime === "browser" ? detectBrowser().browser : undefined;
            const osVersion = await detectOsVersion();
            this.wasmClient = wrapWasmErrors(new wasmModule.ModelHealthClient(this.config.apiKey, "typescript", platform, runtime, runtimeVersion, browser, osVersion, this.config.timeout, this.config.maxRetries));
        }
        catch (error) {
            throw mapModelHealthError(error);
        }
        this.initialized = true;
        this.initError = null; // a manual retry succeeded — drop any earlier autoInit failure
    }
    /**
     * Ensure the client is initialized.
     *
     * @private
     * @throws The original failure if a background `autoInit` initialization failed,
     *   otherwise a generic not-initialized error.
     */
    ensureInitialized() {
        if (!this.initialized) {
            if (this.initError !== null) {
                throw this.initError;
            }
            throw new ModelHealthError("Model Health client not initialized. Call init() before using the client.");
        }
    }
    /**
     * Verifies the API key and returns information about the authenticated account.
     *
     * A cheap way to check that the API key is valid without performing a domain
     * operation.
     *
     * @returns Identity and licensing details for the authenticated account.
     * @throws If the API key is invalid or expired, or the request fails.
     *
     * @example
     * ```typescript
     * const info = await client.accountInfo();
     * console.log(`Authenticated as ${info.email}`);
     * ```
     */
    async accountInfo() {
        this.ensureInitialized();
        const result = await this.wasmClient.accountInfo();
        return this.parseResponse(result);
    }
    /**
     * Returns the current billing/quota state for the authenticated account.
     *
     * Use this to show usage bars and plan limits, and to block recording in your own
     * UI when the quota is exhausted or the subscription has lapsed.
     *
     * @returns The current usage and plan state.
     * @throws If the API key is invalid or expired, or the request fails.
     *
     * @example
     * ```typescript
     * const usage = await client.usage();
     * if (!usage.recordingAllowed) {
     *   console.log(`Recording blocked: ${usage.reason}`);
     * }
     * ```
     */
    async usage() {
        this.ensureInitialized();
        const result = await this.wasmClient.usage();
        return this.parseResponse(result);
    }
    /**
     * The activity types this account can use: the ones everybody has, plus any this
     * account or its organisation added.
     *
     * The list is the account's own and grows, which is why a list filters by a type taken
     * from here rather than by a name known in advance.
     *
     * @throws If the API key is invalid or expired, or the request fails.
     *
     * @example
     * ```typescript
     * const types = await client.activityTypes();
     * const squats = types.find(t => t.displayName === "Squat Exercise")!;
     * for await (const activity of client.activities.list({ activityType: squats })) {
     *   console.log(activity.name);
     * }
     * ```
     */
    async activityTypes() {
        this.ensureInitialized();
        const result = await this.wasmClient.activityTypes();
        return this.parseResponse(result);
    }
    // MARK: - Authentication
    // MARK: - Sessions
    /**
     * Retrieves all sessions for the account associated with the API key.
     *
     * Use this to list existing sessions before creating a new one, or to resume a previous
     * capture workflow.
     *
     * To connect a device to a specific session, use the session `qrcode` URL to download
     * the QR code image data, then display it in your app to be captured by the ModelHealth
     * mobile app.
     *
     * @returns An array of `Session` objects, or an empty array if none exist.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const sessions = await client.sessionList();
     * console.log(`Found ${sessions.length} sessions`);
     *
     * const firstSession = sessions[0];
     * if (firstSession?.qrcode) {
     *   const response = await fetch(firstSession.qrcode);
     *   const qrCodeImageData = new Uint8Array(await response.arrayBuffer());
     *   // Display qrCodeImageData in your app so the mobile app can scan it
     * }
     * ```
     */
    async sessionList() {
        this.ensureInitialized();
        const result = await this.wasmClient.sessionList();
        return this.parseResponse(result, this.bindSession);
    }
    /**
     * Retrieves a specific session by ID with its populated activities.
     *
     * Use this to fetch a known session directly — for example, a public demo session
     * or one whose ID was stored previously.
     *
     * @param sessionId The unique identifier of the session.
     * @returns The `Session` with its populated activity list.
     * @throws If the session doesn't exist or the request fails.
     *
     * @example
     * ```typescript
     * const session = await client.getSession("1f32961c-d2b5-4aae-bc23-3f3db6b31540");
     * console.log(`Activities: ${session.trialsCount}`);
     * ```
     */
    async getSession(sessionId) {
        this.ensureInitialized();
        const result = await this.wasmClient.getSession(sessionId);
        return this.parseResponse(result, this.bindSession);
    }
    /**
     * Points the cameras at the session to record this subject in.
     *
     * Use this to move between subjects in any order, including going back to someone
     * recorded earlier. The session already recording that subject is reused when its camera
     * calibration and static pose are both still good, so the pose does not have to be
     * repeated. Otherwise a new session is started from `session`, exactly as
     * {@link ModelHealthClient.newSessionFromSession} would.
     *
     * @param subject The subject to record next.
     * @param session The session the cameras are pointed at now.
     * @returns The session to record in — one that already existed, the one passed in, or a
     *   new one.
     * @throws On network failure, if the session or subject is not found, or if the API
     *   version in use cannot hand the cameras back to an existing session.
     *
     * @example
     * ```typescript
     * // Everyone does exercise 1, then everyone does exercise 2
     * for (const exercise of ["CMJ", "Squat"]) {
     *   for (const subject of subjects) {
     *     session = await client.switchSubject(subject, session);
     *     await client.startRecording(exercise, session);
     *     await client.stopRecording(session);
     *   }
     * }
     * ```
     */
    async switchSubject(subject, session) {
        this.ensureInitialized();
        const result = await this.wasmClient.switchSubject(session.id, subject.id);
        return this.parseResponse(result, this.bindSession);
    }
    /**
     * Creates a new session from a previous session, inheriting its calibration setup.
     *
     * Use this to move directly to calibrating a new subject without repeating
     * camera connection or checkerboard calibration.
     *
     * @param session The previous, already-calibrated session.
     * @returns A new session ready for a new subject.
     * @throws {string} On network failure or if the session is not found.
     *
     * @example
     * ```typescript
     * const newSession = await client.newSessionFromSession(previousSession);
     * ```
     */
    async newSessionFromSession(session) {
        this.ensureInitialized();
        const result = await this.wasmClient.newSessionFromSessionId(session.id);
        return this.parseResponse(result, this.bindSession);
    }
    /**
     * Creates a session.
     *
     * A session is the parent container for a movement capture workflow. It links
     * related entities such as activities and subjects and provides the context
     * used by subsequent operations.
     *
     * @returns A new `Session` with a unique identifier.
     * @throws If session creation fails.
     *
     * @example
     * ```typescript
     * const session = await client.createSession();
     * ```
     */
    async createSession() {
        this.ensureInitialized();
        const result = await this.wasmClient.createSession();
        return this.parseResponse(result, this.bindSession);
    }
    /**
     * Applies settings to an existing session.
     *
     * Call this after `createSession` and before calibration to override any
     * default settings. If not called, the session retains the defaults applied
     * during creation.
     *
     * All fields in `config` are optional — omit any field to keep its default.
     *
     * @param session The session to configure.
     * @param config The settings to apply. Pass `{}` to keep all defaults.
     * @throws On network failure or authentication error.
     *
     * @example
     * ```typescript
     * const session = await client.createSession();
     *
     * // Override frame rate and data sharing only
     * await client.configureSession(session, {
     *   framerate: 60,
     *   dataSharing: "Share no data"
     * });
     * ```
     */
    async configureSession(session, config = {}) {
        this.ensureInitialized();
        await this.wasmClient.configureSession(decamelizeKeys(session), decamelizeKeys(config));
    }
    /**
     * Calibrates cameras using a checkerboard pattern.
     *
     * Determines each camera's position and orientation in 3D space (extrinsics), enabling
     * reconstruction of real-world movement from multiple 2D video feeds. Required once per
     * session setup — recalibrate only if cameras are moved.
     *
     * > Note: `rows` and `columns` refer to internal corners, not squares. A 5×6 board has
     * > 4 internal corner rows and 5 internal corner columns.
     *
     * @param session The session context in which calibration is performed.
     * @param checkerboardDetails The checkerboard dimensions and placement used for calibration.
     * @param statusCallback Callback called with progress updates during calibration.
     * @throws If calibration fails (for example, checkerboard pattern not detected).
     *
     * @example
     * ```typescript
     * const session = await client.createSession();
     *
     * const details: CheckerboardDetails = {
     *   rows: 4,           // Internal corners, not squares (for 5×6 board)
     *   columns: 5,        // Internal corners, not squares (for 5×6 board)
     *   squareSize: 35,    // Measured in millimeters
     *   placement: "perpendicular"
     * };
     *
     * await client.calibrateCamera(session, details, (status) => {
     *   console.log(status);
     * });
     * ```
     */
    async calibrateCamera(session, checkerboardDetails, statusCallback) {
        this.ensureInitialized();
        const jsCallback = (statusJson) => {
            statusCallback(statusJson);
        };
        await wasmModule.calibrateCamera(this.config.apiKey, "typescript", decamelizeKeys(session), decamelizeKeys(checkerboardDetails), jsCallback);
    }
    /**
     * Calibrates a subject by recording a neutral standing pose.
     *
     * Scales the 3D biomechanical model to the subject's body size. Must be run after
     * camera calibration and requires the subject profile to include height and weight.
     *
     * > Important: The subject must stand upright, feet pointing forward, completely still,
     * > and fully visible to all cameras for the duration of the recording.
     *
     * @param subject The subject to calibrate.
     * @param session The session context in which calibration is performed.
     * @param statusCallback Callback called with calibration status updates.
     * @throws If pose capture fails (for example, subject not detected or insufficient visibility).
     *
     * @example
     * ```typescript
     * await client.calibrateSubject(subject, session, (status) => {
     *   console.log(status);
     * });
     * ```
     */
    async calibrateSubject(subject, session, statusCallback) {
        this.ensureInitialized();
        const jsCallback = (statusJson) => {
            statusCallback(statusJson);
        };
        try {
            await wasmModule.calibrateSubject(this.config.apiKey, "typescript", decamelizeKeys(subject), decamelizeKeys(session), jsCallback);
        }
        finally {
            // Calibrating moves the session to this subject, even when a later step fails:
            // what was remembered of it may point at the subject it had before.
            this.wasmClient.forgetSession(session.id);
        }
    }
    // MARK: - Subjects
    /**
     * Retrieves a subject by its ID.
     *
     * Use this to resolve a subject ID (e.g. from `Session.subjectId`) into full
     * subject details without fetching the entire subject list.
     *
     * @param subjectId The unique identifier of the subject.
     * @returns The `Subject` with its current details.
     * @throws If the subject doesn't exist or the request fails.
     *
     * @example
     * ```typescript
     * const subject = await client.fetchSubject(session.subjectId);
     * console.log(`Subject: ${subject.name}`);
     * ```
     */
    async fetchSubject(subjectId) {
        this.ensureInitialized();
        const result = await this.wasmClient.fetchSubject(subjectId);
        return this.parseResponse(result, this.bindSubject);
    }
    /**
     * Creates a subject profile.
     *
     * Height and weight are required for biomechanical analysis. Once created, the subject
     * can be calibrated using `calibrateSubject`.
     *
     * @param parameters The subject profile details including name and anthropometrics.
     * @returns The newly created `Subject` with its assigned ID.
     * @throws If creation fails (for example, validation error or duplicate name).
     *
     * @example
     * ```typescript
     * const params: SubjectParameters = {
     *   name: "John Smith",
     *   weight: 75.0,        // kilograms
     *   height: 180.0,       // centimeters
     *   birthYear: 1990,
     * };
     *
     * const subject = await client.createSubject(params);
     * console.log(`Created subject with ID: ${subject.id}`);
     *
     * // Use the subject for calibration
     * await client.calibrateSubject(subject, session, (status) => {
     *   console.log(status);
     * });
     * ```
     */
    async createSubject(parameters) {
        this.ensureInitialized();
        const result = await this.wasmClient.createSubject(decamelizeKeys(parameters));
        return this.parseResponse(result, this.bindSubject);
    }
    // MARK: - Links between records
    /**
     * The subject with exactly this name.
     *
     * Not part of the SDK's public surface — {@link SubjectsResource.find} calls it.
     * @internal
     */
    async _findSubject(name) {
        this.ensureInitialized();
        try {
            return this.parseResponse(await this.wasmClient.findSubject(name), this.bindSubject);
        }
        catch (error) {
            throw mapModelHealthError(error);
        }
    }
    /**
     * Opens the sessions a subject was recorded in.
     *
     * Reached through {@link Session} and {@link Subject}; not called directly.
     * @internal
     */
    subjectSessions(subjectId, options) {
        this.ensureInitialized();
        const source = this.wasmClient.subjectSessionsStream(subjectId, decamelizeKeys(sessionFilterFrom(options)), formatOrderBy(options.orderBy) ?? null, options.limit ?? undefined);
        return new ItemStream(this.shapeItems(source, this.bindSession));
    }
    /**
     * Opens the activities recorded for a subject.
     * @internal
     */
    subjectActivities(subjectId, options) {
        this.ensureInitialized();
        const source = this.wasmClient.subjectActivitiesStream(subjectId, decamelizeKeys(activityFilterFrom(options)), formatOrderBy(options.orderBy) ?? null, options.limit ?? undefined);
        return new ItemStream(this.shapeItems(source, this.bindActivity));
    }
    /**
     * Opens the activities recorded in a session.
     * @internal
     */
    sessionActivities(sessionId, options) {
        this.ensureInitialized();
        const source = this.wasmClient.sessionActivitiesStream(sessionId, decamelizeKeys(activityFilterFrom(options)), formatOrderBy(options.orderBy) ?? null, options.limit ?? undefined);
        return new ItemStream(this.shapeItems(source, this.bindActivity));
    }
    // MARK: - Activity Management
    /**
     * Opens a filtered list of activities.
     *
     * Not part of the SDK's public surface — {@link ActivitiesResource} calls it for you.
     * @internal
     */
    _activitiesStream(filter, orderBy, limit) {
        this.ensureInitialized();
        const source = this.wasmClient.activitiesStream(decamelizeKeys(filter), orderBy ?? null, limit ?? undefined);
        return new ItemStream(this.shapeItems(source, this.bindActivity));
    }
    /**
     * Opens a filtered list of subjects.
     *
     * Not part of the SDK's public surface — {@link SubjectsResource} calls it for you.
     * @internal
     */
    _subjectsStream(filter, orderBy, limit) {
        this.ensureInitialized();
        const source = this.wasmClient.subjectsStream(decamelizeKeys(filter), orderBy ?? null, limit ?? undefined);
        return new ItemStream(this.shapeItems(source, this.bindSubject));
    }
    /**
     * Opens a filtered list of sessions.
     *
     * Not part of the SDK's public surface — {@link SessionsResource} calls it for you.
     * @internal
     */
    _sessionsStream(filter, orderBy, limit) {
        this.ensureInitialized();
        const source = this.wasmClient.sessionsStream(decamelizeKeys(filter), orderBy ?? null, limit ?? undefined);
        return new ItemStream(this.shapeItems(source, this.bindSession));
    }
    /**
     * Opens a filtered list of groups.
     *
     * Not part of the SDK's public surface — {@link GroupsResource} calls it for you.
     * @internal
     */
    _groupsStream(filter, orderBy, limit) {
        this.ensureInitialized();
        const source = this.wasmClient.groupsStream(decamelizeKeys(filter), orderBy ?? null, limit ?? undefined);
        return new ItemStream(this.shapeItems(source));
    }
    /**
     * Retrieves an activity by its ID.
     *
     * Use this to fetch the latest state of an activity, including its videos, results,
     * and current processing status.
     *
     * @param activityId The unique identifier of the activity.
     * @returns The `Activity` with its current details.
     * @throws If the activity doesn't exist or the request fails.
     *
     * @example
     * ```typescript
     * const activity = await client.fetchActivity("abc123");
     * console.log(`Activity: ${activity.name ?? "Unnamed"}`);
     * console.log(`Status: ${activity.status}`);
     * ```
     */
    async fetchActivity(activityId) {
        this.ensureInitialized();
        const result = await this.wasmClient.fetchActivity(activityId);
        return this.parseResponse(result, this.bindActivity);
    }
    /**
     * Updates an activity.
     *
     * Only mutable fields (such as `name`) are applied. The stored
     * state is returned, so use the result rather than the input going forward.
     *
     * @param activity The activity to update, with modified properties.
     * @param config Optional config to apply alongside the update (e.g. `addTags`/`removeTags` to modify tags).
     * @returns The updated `Activity` as stored.
     * @throws If the update fails or the request fails.
     *
     * @example
     * ```typescript
     * let activity = await client.fetchActivity("abc123");
     * activity.name = "CMJ Baseline Test";
     * const updated = await client.updateActivity(activity);
     * console.log(`Updated: ${updated.name ?? "Unnamed"}`);
     * ```
     */
    async updateActivity(activity, config) {
        this.ensureInitialized();
        const result = await this.wasmClient.updateActivity(decamelizeKeys(activity), config ? decamelizeKeys(config) : null);
        return this.parseResponse(result, this.bindActivity);
    }
    /**
     * Deletes an activity.
     *
     * Permanently removes the activity and all associated videos, results and metadata.
     *
     * @param activity The activity to delete.
     * @throws If the deletion fails or the request fails.
     *
     * @example
     * ```typescript
     * const activity = await client.fetchActivity("abc123");
     * await client.deleteActivity(activity);
     * ```
     *
     * **Warning:** This operation is irreversible.
     */
    async deleteActivity(activity) {
        this.ensureInitialized();
        await this.wasmClient.deleteActivity(decamelizeKeys(activity));
    }
    /**
     * Retrieves all available activity tags.
     *
     * Use the returned tags to populate a tag picker or validate tag values before
     * assigning them to activities.
     *
     * @returns An array of `ActivityTag` objects, or an empty array if none are configured.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const tags = await client.activityTags();
     * for (const tag of tags) {
     *   console.log(`${tag.label}: ${tag.value}`);
     * }
     * ```
     */
    async activityTags() {
        this.ensureInitialized();
        const result = await this.wasmClient.activityTags();
        return this.parseResponse(result);
    }
    // MARK: - Activities
    /**
     * Retrieves all movement activities associated with a session.
     *
     * Activities represent individual recording trials and contain references to
     * captured videos and results. Use this to review past data or
     * fetch results for completed activities.
     *
     * @param sessionId The session ID to retrieve activities for.
     * @returns An array of `Activity` objects, or an empty array if none exist.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const activities = await client.activityList(session.id);
     *
     * for (const activity of activities) {
     *   console.log(`Activity: ${activity.name ?? activity.id}`);
     *   console.log(`Videos: ${activity.videos.length}`);
     *   console.log(`Results: ${activity.results.length}`);
     * }
     * ```
     */
    async activityList(sessionId) {
        this.ensureInitialized();
        const result = await this.wasmClient.trialList(sessionId);
        return this.parseResponse(result, this.bindActivity);
    }
    /**
     * Downloads video data for a specific activity.
     *
     * Fetches all videos associated with the activity that match the specified version.
     * Downloads run concurrently. Videos with invalid URLs or failed downloads are
     * silently excluded from the result.
     *
     * @param activity The activity whose videos should be downloaded.
     * @param version The version of videos to download (for example, `"raw"` or `"synced"`).
     * @returns An array of `Uint8Array` objects. May be empty if no videos are available
     *   or all downloads fail.
     *
     * @example
     * ```typescript
     * const activity = // ... fetched activity
     * const videoData = await client.videosForActivity(activity, "raw");
     *
     * for (const data of videoData) {
     *   // Process video data
     * }
     * ```
     *
     * Downloads run concurrently. Individual download failures do not affect other requests.
     */
    async videosForActivity(activity, version = "synced") {
        this.ensureInitialized();
        const result = await this.wasmClient.videosForActivity(decamelizeKeys(activity), version);
        const videos = [];
        for (let i = 0; i < result.length; i++) {
            videos.push(new Uint8Array(result[i]));
        }
        return videos;
    }
    /**
     * Downloads motion data from a processed activity.
     *
     * Use this after an activity reaches `ready` status to retrieve biomechanical result files
     * such as kinematics, marker data, or an OpenSim model. Downloads run concurrently and
     * failed downloads are silently excluded from results.
     *
     * @param activity The activity to download data from. Must have completed processing.
     * @param dataTypes The motion data types to download (for example, `"kinematics_mot"`, `"markers"`, `"animation"`).
     * @returns An array of `MotionData`, one entry per successfully downloaded type. May be empty
     *   if no results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * // Download kinematics in MOT format
     * const results = await client.motionDataForActivity(activity, ["kinematics_mot"]);
     *
     * for (const result of results) {
     *   switch (result.type) {
     *     case "kinematics_mot":
     *       // Use result.data directly as a .mot file
     *       break;
     *   }
     * }
     *
     * ```
     */
    async motionDataForActivity(activity, dataTypes) {
        this.ensureInitialized();
        const result = await this.wasmClient.motionDataForActivity(decamelizeKeys(activity), dataTypes);
        const parsed = this.parseResponse(result);
        return parsed.map((item) => ({ ...item, data: new Uint8Array(item.data) }));
    }
    /**
     * Downloads result data for an activity with a completed analysis.
     *
     * Use this after `analysisStatus` returns `completed` to retrieve metrics,
     * a report, or raw data. Downloads run concurrently and failed downloads are silently
     * excluded from results.
     *
     * @param activity The activity to download analysis results from. Must have a completed analysis.
     * @param dataTypes The analysis result data types to download (for example, `"metrics"`, `"report"`, `"data"`).
     * @returns An array of `AnalysisData`, one entry per successfully downloaded type.
     *   May be empty if no results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * const results = await client.analysisDataForActivity(
     *   activity,
     *   ["metrics", "report"]
     * );
     *
     * for (const result of results) {
     *   switch (result.type) {
     *     case "metrics":
     *       const json = JSON.parse(new TextDecoder().decode(result.data));
     *       break;
     *     case "report":
     *       // Use result.data directly as a PDF
     *       break;
     *     case "data":
     *       // Use result.data directly as a ZIP file
     *       break;
     *   }
     * }
     * ```
     *
     */
    async analysisDataForActivity(activity, dataTypes) {
        this.ensureInitialized();
        const result = await this.wasmClient.analysisDataForActivity(decamelizeKeys(activity), dataTypes);
        const parsed = this.parseResponse(result);
        return parsed.map((item) => ({ ...item, data: new Uint8Array(item.data) }));
    }
    /**
     * Fetches an activity's results, each on its own.
     *
     * Every result asked for ends up in one of two places on the returned object: `data`
     * holds the bytes of each result that was fetched, and `errors` holds the reason for
     * each of the others. One result failing does not stop the others. A result the activity
     * does not have is in `errors` as a {@link NotAvailableError}, whose message says whether
     * trying again later can help.
     *
     * Use `activity.hasResults` to tell whether processing has finished.
     *
     * @param activity The activity whose results to fetch.
     * @param artifacts The result types to fetch.
     * @returns A {@link FetchedArtifacts}.
     * @throws {ModelHealthError} If the client is not initialized or `artifacts` holds an
     * invalid value. A failure while fetching, such as a lost network, does not reject: it is
     * in `errors`.
     *
     * @example
     * ```typescript
     * const fetched = await client.fetchArtifacts(activity, ["metrics", "report"]);
     * for (const [kind, error] of Object.entries(fetched.errors)) {
     *   console.log(`no ${kind}: ${error.message}`);
     * }
     * const report = fetched.data.report; // a Uint8Array holding the PDF
     * ```
     */
    async fetchArtifacts(activity, artifacts) {
        this.ensureInitialized();
        const result = await this.wasmClient.fetchArtifacts(decamelizeKeys(activity), artifacts);
        const fetched = { data: {}, errors: {} };
        for (const [kind, bytes] of Object.entries(result.data)) {
            fetched.data[kind] = bytes;
        }
        for (const [kind, error] of Object.entries(result.errors)) {
            fetched.errors[kind] = mapModelHealthError(error);
        }
        return fetched;
    }
    /**
     * The file name a result of this activity is saved under, for writing the bytes
     * {@link fetchArtifacts} returns.
     *
     * The name is `{stem}{suffix}`, the suffix fixed by the result type (`_report.pdf`,
     * `_kinematics.csv`, ...). Without a `stem`, the activity's name made safe for a file
     * name and the first 8 characters of its id are used, or its whole id when it has no
     * name, so two activities of the same name do not overwrite each other's files. Python
     * and Swift save under the same names.
     *
     * @param activity The activity the result belongs to.
     * @param artifact The result type.
     * @param stem The start of the file name, if not the default.
     * @returns The file name, without a directory.
     * @throws {ModelHealthError} If the client is not initialized or `stem` is not a plain
     * file name, such as one holding a path separator.
     *
     * @example
     * ```typescript
     * const fetched = await client.fetchArtifacts(activity, ["report"]);
     * const report = fetched.data.report;
     * if (report) {
     *   await writeFile(client.artifactFileName(activity, "report"), report);
     * }
     * ```
     */
    artifactFileName(activity, artifact, stem) {
        this.ensureInitialized();
        try {
            return wasmModule.artifactFileName(decamelizeKeys(activity), artifact, stem);
        }
        catch (err) {
            throw mapModelHealthError(err);
        }
    }
    // MARK: - Recording & Analysis
    /**
     * Creates an activity and starts recording a dynamic movement trial.
     *
     * Must be called after both camera and subject calibration are complete.
     * Call `stopRecording` when the subject has finished the movement.
     *
     * @param activityName A descriptive name for this activity (e.g., `"cmj"`, `"squat"`).
     * @param session The session this activity is associated with.
     * @param config Optional recording configuration. Set `config.config` to override the session-level framerate or filter frequency for this recording only.
     * @returns The newly created `Activity`.
     * @throws If recording cannot start (e.g., missing calibration).
     *
     * @example
     * ```typescript
     * const activity = await client.startRecording("cmj", session, { activityType: ActivityType.CounterMovementJump });
     * // Subject performs movement...
     * await client.stopRecording(session);
     * ```
     */
    async startRecording(activityName, session, config) {
        this.ensureInitialized();
        const result = await this.wasmClient.startRecording(activityName, decamelizeKeys(session), config ? decamelizeKeys(config) : null);
        return this.parseResponse(result, this.bindActivity);
    }
    /**
     * Stops the active recording for a movement trial.
     *
     * Call this after the subject has completed the movement. Once stopped, the recorded
     * videos begin uploading and can be tracked with `activityStatus`.
     *
     * @param session The session context to stop recording in.
     * @throws If there is no active recording or the request fails.
     *
     * @example
     * ```typescript
     * await client.stopRecording(session);
     * ```
     */
    async stopRecording(session) {
        this.ensureInitialized();
        await this.wasmClient.stopRecording(decamelizeKeys(session));
    }
    /**
     * Retrieves the current processing status of an activity.
     *
     * Poll this method after `stopRecording` to track upload and processing progress.
     * Once the status reaches `ready`, pass the activity to `startAnalysis`.
     *
     * @param activity The activity to check status for.
     * @returns The current `ActivityStatus`.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const status = await client.activityStatus(activity);
     *
     * switch (status.type) {
     *   case "ready":
     *     console.log("Activity ready for analysis");
     *     break;
     *   case "processing":
     *     console.log("Still processing...");
     *     break;
     *   case "uploading":
     *     console.log(`Uploaded ${status.uploaded}/${status.total} videos`);
     *     break;
     *   case "failed":
     *     console.log("Processing failed");
     *     break;
     * }
     * ```
     */
    async activityStatus(activity) {
        this.ensureInitialized();
        const result = await this.wasmClient.activityStatus(decamelizeKeys(activity));
        return this.parseResponse(result);
    }
    /**
     * Starts an analysis task for an activity that is ready for analysis.
     *
     * Call this after `activityStatus` returns `ready`. Use the
     * returned `Analysis` with `analysisStatus` to poll progress.
     *
     * @param activityType The type of analysis to run (for example, `"gait"`, `"counter_movement_jump"`).
     * @param activity The activity to analyze.
     * @param session The session context containing the activity.
     * @returns An `Analysis` for tracking analysis progress.
     * @throws If the activity is not ready or the request fails.
     *
     * @example
     * ```typescript
     * const task = await client.startAnalysis("counter_movement_jump", activity, session);
     * const status = await client.analysisStatus(task);
     * ```
     */
    async startAnalysis(activityType, activity, session) {
        this.ensureInitialized();
        const result = await this.wasmClient.startAnalysis(activityType, decamelizeKeys(activity), decamelizeKeys(session));
        return this.parseResponse(result);
    }
    /**
     * Retrieves the current status of an analysis task.
     *
     * Poll this method after `startAnalysis` to monitor progress.
     * When status reaches `completed`, download results with `analysisDataForActivity`.
     *
     * @param task The task returned from `startAnalysis`.
     * @returns The current `AnalysisStatus`.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const status = await client.analysisStatus(task);
     *
     * switch (status.type) {
     *   case "processing":
     *     console.log("Analysis running...");
     *     break;
     *   case "completed":
     *     console.log("Analysis complete");
     *     break;
     *   case "failed":
     *     console.log("Analysis failed");
     *     break;
     * }
     * ```
     */
    async analysisStatus(task) {
        this.ensureInitialized();
        const result = await this.wasmClient.analysisStatus(decamelizeKeys(task));
        return this.parseResponse(result);
    }
    // MARK: - External Data
    /**
     * Attaches external files to an activity and returns a refreshed `Activity`.
     *
     * Use this after `activityStatus` returns `ready` to attach external data
     * (e.g. measurements from another source) before running analysis.
     *
     * @param activity The activity to attach files to.
     * @param files The external files to attach, with tag, file extension and data.
     * @returns The refreshed `Activity` containing the newly created result entries.
     * @throws If any upload fails, a tag is reserved or duplicated, or the network is unavailable.
     *
     * @example
     * ```typescript
     * const file: ExternalResultFile = {
     *   dataType: { tag: "force_plate", format: "csv" },
     *   data: new TextEncoder().encode("time,fx,fy,fz\n0.0,0,0,650\n"),
     * };
     * const updated = await client.addMotionDataToActivity(activity, [file]);
     * await client.startAnalysis("counter_movement_jump", updated, session);
     * ```
     */
    async addMotionDataToActivity(activity, files) {
        this.ensureInitialized();
        const wireFiles = files.map(f => ({
            tag: f.tag,
            extension: f.extension,
            data: f.data,
        }));
        const result = await this.wasmClient.addMotionDataToActivity(decamelizeKeys(activity), wireFiles);
        return this.parseResponse(result, this.bindActivity);
    }
    // MARK: - Import
    /**
     * Imports a set of trials into a new session.
     *
     * Performs the full import workflow: session creation, configuration,
     * subject association, trial creation, video download and upload, processing
     * trigger and polling until complete for each trial.
     *
     * Progress is reported via `statusCallback` with `ImportStatus` values.
     *
     * @param activitiesJson A JSON array of trial objects to import.
     * @param subject The subject to associate with the session.
     * @param config Session configuration. Pass `{}` for defaults.
     * @param statusCallback Callback called with progress updates. Defaults to no-op.
     * @returns The `Session` containing all imported trials.
     * @throws If any step of the import fails.
     *
     * @example
     * ```typescript
     * const session = await client.importSession(
     *   activitiesJson,
     *   subject,
     *   null,
     *   { framerate: 60 },
     *   (status) => {
     *     switch (status.type) {
     *       case "creating_session":
     *         console.log("Creating session...");
     *         break;
     *       case "uploading_video":
     *         console.log(`[${status.trial}] ${status.uploaded}/${status.total}`);
     *         break;
     *       case "processing":
     *         console.log("Processing...");
     *         break;
     *     }
     *   }
     * );
     * ```
     */
    async importSession(activitiesJson, subject, config = {}, statusCallback = () => { }) {
        this.ensureInitialized();
        const jsCallback = (statusJson) => {
            let status;
            if (typeof statusJson === "string") {
                // Unit variants serialize as plain strings via serde external tagging
                status = { type: statusJson };
            }
            else if (statusJson !== null && typeof statusJson === "object") {
                const obj = statusJson;
                if ("created_session" in obj) {
                    const payload = obj["created_session"];
                    status = { type: "created_session", session_id: payload.session_id };
                }
                else if ("uploading_video" in obj) {
                    const payload = obj["uploading_video"];
                    status = { type: "uploading_video", trial: payload.trial, uploaded: payload.uploaded, total: payload.total };
                }
                else {
                    return;
                }
            }
            else {
                return;
            }
            statusCallback(status);
        };
        const result = await this.wasmClient.importSession(activitiesJson, decamelizeKeys(subject), decamelizeKeys(config), jsCallback);
        return this.parseResponse(result, this.bindSession);
    }
    // MARK: - Archive
    /**
     * Begins preparing a session archive.
     *
     * Packaging the session data into a ZIP file starts in the background.
     * Poll `archiveStatus` until the status is `ready`, then download the archive
     * with `archiveData`.
     *
     * @param session The session to archive.
     * @param withVideos Whether to include raw videos in the archive. Defaults to `false`.
     * @returns An `Archive` for tracking archive preparation progress.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const archive = await client.prepareArchive(session);
     *
     * let status: ArchiveStatus;
     * do {
     *   status = await client.archiveStatus(archive);
     * } while (status.type === "processing");
     *
     * const zipData = await client.archiveData(archive);
     * ```
     */
    async prepareArchive(session, withVideos = false) {
        this.ensureInitialized();
        const result = await this.wasmClient.prepareArchive(decamelizeKeys(session), withVideos);
        return this.parseResponse(result);
    }
    /**
     * Retrieves the current status of an archive preparation task.
     *
     * Poll this method after `prepareArchive` until the status is `ready`,
     * then download the archive with `archiveData`.
     *
     * @param archive The archive returned from `prepareArchive`.
     * @returns The current `ArchiveStatus`.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const status = await client.archiveStatus(archive);
     *
     * switch (status.type) {
     *   case "processing":
     *     console.log("Archive being prepared...");
     *     break;
     *   case "ready":
     *     console.log("Archive ready to download");
     *     break;
     *   case "failed":
     *     console.log("Archive preparation failed");
     *     break;
     * }
     * ```
     */
    async archiveStatus(archive) {
        this.ensureInitialized();
        const result = await this.wasmClient.archiveStatus(decamelizeKeys(archive));
        return this.parseResponse(result);
    }
    /**
     * Downloads the prepared archive as raw ZIP data.
     *
     * Call this after `archiveStatus` returns `ready`. The download URL is
     * managed internally and cached for the lifetime of the WASM instance.
     *
     * @param archive The archive returned from `prepareArchive`.
     * @returns The raw ZIP file bytes as a `Uint8Array`.
     * @throws If the archive is not yet ready or the download fails.
     *
     * @example
     * ```typescript
     * const zipData = await client.archiveData(archive);
     * // Write zipData to a file or process it in memory
     * ```
     */
    async archiveData(archive) {
        this.ensureInitialized();
        const result = await this.wasmClient.archiveData(decamelizeKeys(archive));
        return new Uint8Array(result);
    }
    // MARK: - Metrics
    /**
     * Fetch dashboard metrics for a single activity.
     *
     * @param activityId UUID of the activity.
     * @returns The dashboard metrics organized into category groups, or `null` if the
     *   activity has not been analyzed yet.
     * @throws On network failure or if the activity is not found.
     *
     * @example
     * ```typescript
     * const metrics = await client.activityMetrics(activity.id);
     * if (metrics === null) {
     *   console.log("No metrics yet — this activity has not been analyzed.");
     * } else {
     *   for (const group of metrics.groups) {
     *     console.log(group.name, group.metrics.map(m => `${m.name}: ${m.value}`));
     *   }
     * }
     * ```
     */
    async activityMetrics(activityId) {
        this.ensureInitialized();
        const result = await this.wasmClient.activityMetrics(activityId);
        if (result == null)
            return null;
        return this.parseResponse(result);
    }
    /**
     * Fetch dashboard metrics for all activities belonging to a subject.
     *
     * @param subjectId Numeric ID of the subject.
     * @param start Optional start date in `YYYY-MM-DD` format.
     * @param end Optional end date in `YYYY-MM-DD` format.
     * @returns Array of per-activity metric payloads.
     * @throws On network failure or if the subject is not found.
     *
     * @example
     * ```typescript
     * const allMetrics = await client.subjectMetrics(subject.id, "2024-01-01", "2024-12-31");
     * ```
     */
    async subjectMetrics(subjectId, start, end) {
        this.ensureInitialized();
        const result = await this.wasmClient.subjectMetrics(subjectId, start ?? null, end ?? null);
        return this.parseResponse(result);
    }
    // MARK: - Profile
    /**
     * Sets the video upload mode
     *
     * @param mode The desired video upload mode.
     * @throws {string} On network failure or if the update is rejected.
     *
     * @example
     * ```typescript
     * await client.setVideoUploadMode("disabled");
     * ```
     */
    async setVideoUploadMode(mode) {
        this.ensureInitialized();
        await this.wasmClient.setVideoUploadMode(mode);
    }
    // MARK: - Logging
    /**
     * Adjusts the log level without touching the registered handler.
     *
     * @param level How verbose the log event stream should be.
     * @throws {string} If the level cannot be applied.
     *
     * @example
     * ```typescript
     * client.setLogLevel("warn");
     * ```
     */
    setLogLevel(level) {
        this.ensureInitialized();
        this.wasmClient.setLogLevel(level);
    }
    /**
     * Registers or clears the persistent log handler.
     *
     * Passing `null` for the handler clears it regardless of `level`.
     *
     * @param handler Called with a {@link LogEvent} for each event at or below `level`.
     *   Pass `null` to stop receiving events.
     * @param level How verbose the log event stream should be. Ignored when `handler`
     *   is `null`.
     * @throws {string} If the handler cannot be registered.
     *
     * @example
     * ```typescript
     * client.setLogHandler((event) => {
     *   console.log(`[modelhealth] ${event.code}: ${event.message}`);
     * });
     *
     * // Stop receiving events
     * client.setLogHandler(null);
     * ```
     */
    setLogHandler(handler, level = "info") {
        this.ensureInitialized();
        this.wasmClient.setLogHandler(handler, level);
    }
    /**
     * Releases resources held by this client, including deregistering any log handler.
     *
     * The client cannot be used after calling this.
     *
     * @example
     * ```typescript
     * client.dispose();
     * ```
     */
    dispose() {
        this.wasmClient?.free();
    }
    // MARK: - Utilities
    /**
     * Parse a WASM response and normalize object keys to camelCase.
     *
     * Normalizes snake_case field names from the WASM layer to idiomatic
     * TypeScript camelCase before
     * returning to the caller.
     *
     * @private
     * @param value Value from WASM (JsValue or JSON string)
     * @returns Parsed, camelised TypeScript object
     */
    parseResponse(value, bind) {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        const shaped = parseDates(camelizeKeys(parsed));
        if (bind) {
            for (const model of Array.isArray(shaped) ? shaped : [shaped]) {
                if (model !== null && typeof model === "object")
                    bind(model);
            }
        }
        return shaped;
    }
    /**
     * Applies the SDK's usual response shaping to every item a list hands over.
     *
     * The core layer speaks `snake_case` and ISO strings; the same conversion every other
     * method goes through has to apply here too, item by item as they arrive.
     */
    shapeItems(source, bind) {
        const shape = (items) => this.parseResponse(items, bind);
        return {
            nextItems: async () => shape(await source.nextItems()),
            total: () => source.total(),
            cachedTotal: () => source.cachedTotal(),
            all: async () => shape(await source.all()),
            free: () => source.free(),
        };
    }
}
/**
 * Whether the `ModelHealthService` deprecation notice has already been printed.
 *
 * Warning once per process mirrors Python's `warnings.warn`, which dedupes by default,
 * and keeps a loop that constructs many clients from flooding the console.
 */
let hasWarnedServiceDeprecated = false;
/**
 * Deprecated alias for {@link ModelHealthClient}.
 *
 * @deprecated Use {@link ModelHealthClient} instead. Kept for backward
 * compatibility; will be removed no sooner than two minor releases and six
 * months after this deprecation.
 */
export class ModelHealthService extends ModelHealthClient {
    constructor(config) {
        super(config);
        if (!hasWarnedServiceDeprecated) {
            hasWarnedServiceDeprecated = true;
            console.warn("ModelHealthService is deprecated and will be removed in a future release; use ModelHealthClient instead.");
        }
    }
}
/**
 * Serialize activity metrics to a JSON string (snake_case keys, matching the
 * wire format shared with the Python and Swift SDKs).
 *
 * Pretty-printed (indented) by default; pass `pretty=false` for compact output.
 */
export function activityMetricsToJson(metrics, pretty = true) {
    return JSON.stringify(decamelizeKeys(metrics), null, pretty ? 2 : undefined);
}
// MARK: - Exports
export * from "./types.js";
export * from "./errors.js";
export * from "./streams.js";
/**
 * Internal response-transform pipeline, exported only so `tests/` can exercise it
 * directly and in the same order `parseResponse` uses in practice — see
 * `parseResponse` above for the composition. Not part of the public API: no
 * compatibility guarantee, may change or disappear without notice.
 * @internal
 */
export const __internal = {
    camelizeKeys,
    decamelizeKeys,
    parseDates,
    hide,
    activityFilterFrom,
    sessionFilterFrom,
    initWasm,
};
//# sourceMappingURL=index.js.map