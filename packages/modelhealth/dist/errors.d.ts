/**
 * Model Health SDK error types.
 *
 * The WASM layer throws a JS `Error` carrying `code`/`subCode`/`statusCode` properties
 * `mapModelHealthError` reconstructs the specific error class
 * below from those properties instead of callers having to parse `.message`.
 *
 * @packageDocumentation
 */
/**
 * Base class for all errors thrown by the Model Health SDK.
 *
 * `code`/`subCode`/`statusCode` are the raw wire discriminants for callers that want
 * to branch on specifics not covered by one of the subclasses below.
 */
export declare class ModelHealthError extends Error {
    readonly code: number;
    readonly subCode: number;
    readonly statusCode: number;
    constructor(message: string, code?: number, subCode?: number, statusCode?: number);
}
/** The API key was missing, empty, or rejected (401/403), or authentication is otherwise required. */
export declare class AuthenticationError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/** The requested resource (session, activity, subject, etc.) does not exist (HTTP 404). */
export declare class NotFoundError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/** The server rejected the request (HTTP 400–499, other than 401/403/404). */
export declare class ClientError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/** The server failed to process the request (HTTP 500–599). */
export declare class ServerError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/** A network-level failure (timeout, connection lost, unreachable host, etc.). */
export declare class NetworkError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/** Camera or subject calibration failed. */
export declare class CalibrationError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/** The requested operation isn't supported by this client configuration. */
export declare class UnsupportedOperationError extends ModelHealthError {
    constructor(message: string, code: number, subCode: number, statusCode: number);
}
/**
 * Reconstructs the specific `ModelHealthError` subclass from a thrown WASM error.
 *
 * Falls back to the generic `ModelHealthError` (or wraps a non-Error throw as one) when
 * the thrown value doesn't carry recognized `code`/`subCode`/`statusCode` properties —
 * e.g. an error from outside the WASM boundary.
 */
export declare function mapModelHealthError(err: unknown): ModelHealthError;
//# sourceMappingURL=errors.d.ts.map