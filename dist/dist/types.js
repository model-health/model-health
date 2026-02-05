/**
 * Model Health SDK TypeScript Types
 *
 * Complete type definitions for the Model Health biomechanics SDK.
 *
 * @packageDocumentation
 */
/**
 * In-memory token storage implementation.
 *
 * **Warning**: Not secure - tokens are lost on page refresh.
 * Only use for development and testing.
 *
 * For production, use:
 * - Encrypted IndexedDB
 * - HttpOnly cookies with CSRF protection
 * - Platform-specific secure storage
 */
export class MemoryTokenStorage {
    constructor() {
        this.token = null;
    }
    async getToken() {
        return this.token;
    }
    async setToken(token) {
        this.token = token;
    }
    async removeToken() {
        this.token = null;
    }
}
/**
 * LocalStorage-based token storage implementation.
 *
 * **Warning**: LocalStorage is not encrypted. Use secure
 * HTTP-only cookies or encrypted storage for production.
 *
 * @example
 * ```typescript
 * const storage = new LocalStorageTokenStorage("my_app_token");
 * const client = new ModelHealthService({ storage });
 * ```
 */
export class LocalStorageTokenStorage {
    /**
     * Create a LocalStorage token storage.
     *
     * @param key Storage key name (default: "modelhealth_token")
     */
    constructor(key = "modelhealth_token") {
        this.key = key;
    }
    async getToken() {
        if (typeof localStorage === "undefined") {
            return null;
        }
        return localStorage.getItem(this.key);
    }
    async setToken(token) {
        if (typeof localStorage === "undefined") {
            throw new Error("localStorage is not available");
        }
        localStorage.setItem(this.key, token);
    }
    async removeToken() {
        if (typeof localStorage === "undefined") {
            return;
        }
        localStorage.removeItem(this.key);
    }
}
// MARK: - Helper Functions for Analysis Results
/**
 * Extract jump height from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Jump height in centimeters, or null if not available
 */
export function getJumpHeight(result) {
    const metric = result.metrics["00_jump_height_COM"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
/**
 * Extract jump time from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Jump time in seconds, or null if not available
 */
export function getJumpTime(result) {
    const metric = result.metrics["01_jump_time"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
/**
 * Extract concentric/eccentric time ratio from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Time ratio, or null if not available
 */
export function getConcentricEccentricTimeRatio(result) {
    const metric = result.metrics["02_ratio_concentric_eccentric_time"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
/**
 * Extract reactive strength index from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Reactive strength index, or null if not available
 */
export function getReactiveStrengthIndex(result) {
    const metric = result.metrics["03_reactive_strength_index_COM"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
/**
 * Extract peak vertical velocity from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Peak velocity in m/s, or null if not available
 */
export function getPeakVerticalVelocity(result) {
    const metric = result.metrics["04_peak_vertical_COM_speed_during_takeoff"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
/**
 * Extract peak knee extension speed during takeoff from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in deg/s, or null if not available
 */
export function getPeakKneeExtensionSpeed(result) {
    const metric = result.metrics["05_peak_knee_extension_speed_during_takeoff"];
    return metric?.value.type === "bilateral"
        ? { left: metric.value.left, right: metric.value.right }
        : null;
}
/**
 * Extract peak hip extension speed during takeoff from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in deg/s, or null if not available
 */
export function getPeakHipExtensionSpeed(result) {
    const metric = result.metrics["06_peak_hip_extension_speed_during_takeoff"];
    return metric?.value.type === "bilateral"
        ? { left: metric.value.left, right: metric.value.right }
        : null;
}
/**
 * Extract peak knee flexion angle during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in degrees, or null if not available
 */
export function getPeakKneeFlexionLanding(result) {
    const metric = result.metrics["07_peak_knee_flexion_angle_during_landing"];
    return metric?.value.type === "bilateral"
        ? { left: metric.value.left, right: metric.value.right }
        : null;
}
/**
 * Extract peak knee valgus angle during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in degrees, or null if not available
 */
export function getPeakKneeValgusLanding(result) {
    const metric = result.metrics["08_peak_dynamic_knee_valgus_angle_during_landing"];
    return metric?.value.type === "bilateral"
        ? { left: metric.value.left, right: metric.value.right }
        : null;
}
/**
 * Extract peak hip flexion angle during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in degrees, or null if not available
 */
export function getPeakHipFlexionLanding(result) {
    const metric = result.metrics["09_peak_hip_flexion_angle_during_landing"];
    return metric?.value.type === "bilateral"
        ? { left: metric.value.left, right: metric.value.right }
        : null;
}
/**
 * Extract peak trunk flexion during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Trunk flexion angle in degrees, or null if not available
 */
export function getPeakTrunkFlexionLanding(result) {
    const metric = result.metrics["10_peak_trunk_flexion_relative_to_ground_during_landing"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
/**
 * Extract peak trunk lean during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Trunk lean angle in degrees, or null if not available
 */
export function getPeakTrunkLeanLanding(result) {
    const metric = result.metrics["11_peak_trunk_lean_relative_to_ground_during_landing"];
    return metric?.value.type === "single" ? metric.value.value : null;
}
//# sourceMappingURL=types.js.map