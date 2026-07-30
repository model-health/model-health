/**
 * Model Health SDK error types.
 *
 * The WASM layer throws a JS `Error` carrying `code`/`subCode`/`statusCode` properties
 * `mapModelHealthError` reconstructs the specific error class
 * below from those properties instead of callers having to parse `.message`.
 *
 * @packageDocumentation
 */
// MARK: - Error Classes
/**
 * Base class for all errors thrown by the Model Health SDK.
 *
 * `code`/`subCode`/`statusCode` are the raw wire discriminants for callers that want
 * to branch on specifics not covered by one of the subclasses below.
 */
export class ModelHealthError extends Error {
    constructor(message, code = -1, subCode = -1, statusCode = 0) {
        super(message);
        this.name = "ModelHealthError";
        this.code = code;
        this.subCode = subCode;
        this.statusCode = statusCode;
    }
}
/** The API key was missing, empty, or rejected (401/403), or authentication is otherwise required. */
export class AuthenticationError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "AuthenticationError";
    }
}
/** The requested resource (session, activity, subject, etc.) does not exist (HTTP 404). */
export class NotFoundError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "NotFoundError";
    }
}
/** The server rejected the request (HTTP 400–499, other than 401/403/404). */
export class ClientError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "ClientError";
    }
}
/** The server failed to process the request (HTTP 500–599). */
export class ServerError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "ServerError";
    }
}
/** A network-level failure (timeout, connection lost, unreachable host, etc.). */
export class NetworkError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "NetworkError";
    }
}
/** Camera or subject calibration failed. */
export class CalibrationError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "CalibrationError";
    }
}
/** The requested operation isn't supported by this service configuration. */
export class UnsupportedOperationError extends ModelHealthError {
    constructor(message, code, subCode, statusCode) {
        super(message, code, subCode, statusCode);
        this.name = "UnsupportedOperationError";
    }
}
// MARK: - Mapping
/**
 * Wire discriminants matching `ModelHealthError::wire_codes`.  `code` selects
 * the top-level variant; `subCode`/`statusCode` carry the nested detail (only
 * meaningful for `Http`/`Url`/`Calibration`).
 */
const ERROR_CODE = {
    CALIBRATION: 0,
    HTTP: 1,
    URL: 2,
    UNEXPECTED_RESPONSE: 3,
    INTERNAL_ERROR: 4,
    INVALID_API_KEY: 5,
    INVALID_INPUT: 6,
    NOT_SUPPORTED: 7,
};
const HTTP_SUB_CODE = {
    CLIENT_ERROR: 0,
    SERVER_ERROR: 1,
    UNEXPECTED_STATUS_CODE: 2,
};
/**
 * Reconstructs the specific `ModelHealthError` subclass from a thrown WASM error.
 *
 * Falls back to the generic `ModelHealthError` (or wraps a non-Error throw as one) when
 * the thrown value doesn't carry recognized `code`/`subCode`/`statusCode` properties —
 * e.g. an error from outside the WASM boundary.
 */
export function mapModelHealthError(err) {
    if (!(err instanceof Error)) {
        return new ModelHealthError(String(err));
    }
    const wire = err;
    const code = typeof wire.code === "number" ? wire.code : -1;
    const subCode = typeof wire.subCode === "number" ? wire.subCode : -1;
    const statusCode = typeof wire.statusCode === "number" ? wire.statusCode : 0;
    const message = err.message;
    switch (code) {
        case ERROR_CODE.CALIBRATION:
            return new CalibrationError(message, code, subCode, statusCode);
        case ERROR_CODE.HTTP:
            if (subCode === HTTP_SUB_CODE.CLIENT_ERROR) {
                if (statusCode === 401 || statusCode === 403) {
                    return new AuthenticationError(message, code, subCode, statusCode);
                }
                if (statusCode === 404) {
                    return new NotFoundError(message, code, subCode, statusCode);
                }
                return new ClientError(message, code, subCode, statusCode);
            }
            if (subCode === HTTP_SUB_CODE.SERVER_ERROR) {
                return new ServerError(message, code, subCode, statusCode);
            }
            return new ModelHealthError(message, code, subCode, statusCode);
        case ERROR_CODE.URL:
            // -1013 = UserAuthenticationRequired, -1012 = UserCancelledAuthentication
            if (subCode === -1013 || subCode === -1012) {
                return new AuthenticationError(message, code, subCode, statusCode);
            }
            return new NetworkError(message, code, subCode, statusCode);
        case ERROR_CODE.NOT_SUPPORTED:
            return new UnsupportedOperationError(message, code, subCode, statusCode);
        default:
            return new ModelHealthError(message, code, subCode, statusCode);
    }
}
//# sourceMappingURL=errors.js.map