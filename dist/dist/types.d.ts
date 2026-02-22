/**
 * Model Health SDK TypeScript Types
 *
 * Complete type definitions for the Model Health biomechanics SDK.
 *
 * @packageDocumentation
 */
/**
 * A session represents a collection of activities recorded together.
 *
 * Sessions contain multiple activities, each with their own videos and analysis results.
 * Sessions can be shared publicly or kept private.
 */
export interface Session {
    id: string;
    user: number;
    public: boolean;
    name: string;
    session_name: string;
    qrcode?: string;
    activities: Activity[];
    subject?: number;
    activities_count: number;
}
/**
 * Gender identity options for subject demographics.
 */
export type Gender = "woman" | "man" | "transgender" | "non_binary" | "no_response";
/**
 * Sex assigned at birth options for subject demographics.
 */
export type Sex = "woman" | "man" | "intersex" | "not_listed" | "no_response";
/**
 * Subject information for biomechanical analysis.
 *
 * Subjects represent individuals being analyzed. Their anthropometric
 * data is used for scaling musculoskeletal models and calculating
 * personalized biomechanical metrics.
 */
export interface Subject {
    id: number;
    name: string;
    weight?: number;
    height?: number;
    age?: number;
    birth_year?: number;
    gender: Gender;
    sex_at_birth: Sex;
    characteristics: string;
    subject_tags: string[];
}
/**
 * Parameters required for creating a new subject.
 */
export interface SubjectParameters {
    name: string;
    weight: number;
    height: number;
    birth_year: number;
    sex_at_birth: Sex;
    gender: Gender;
    characteristics: string;
    subject_tags: string[];
    terms: boolean;
}
/**
 * Video file associated with an activity.
 */
export interface Video {
    id: string;
    activity: string;
    video?: string;
    video_thumb?: string;
}
/**
 * An activity represents a single recording within a session.
 *
 * Activities contain the captured videos, processing status, and analysis results.
 */
export interface Activity {
    id: string;
    session: string;
    name?: string;
    status: string;
    videos: Video[];
    results: ActivityResult[];
}
/**
 * Sort order for activity lists.
 *
 * Specifies how activities should be ordered when retrieved from the API.
 *
 * @example
 * ```typescript
 * const activities = await client.getActivitiesForSubject(
 *   subjectId,
 *   0,
 *   20,
 *   "updated_at"
 * );
 * ```
 */
export type ActivitySort = "updated_at";
/**
 * A tag that can be applied to activities for categorization.
 *
 * Activity tags provide a way to organize and filter activities.
 * Common tags might include activity types (e.g., "CMJ", "Squat"),
 * conditions (e.g., "Baseline", "Post-Training"), or any custom categorization.
 *
 * @example
 * ```typescript
 * const tags = await client.getActivityTags();
 * const cmjTag = tags.find(t => t.value === "cmj");
 * console.log(`CMJ activities: ${cmjTag?.label ?? ""}`);
 * ```
 */
export interface ActivityTag {
    value: string;
    label: string;
}
/**
 * Result file associated with an activity.
 *
 * Results can include analysis outputs, synchronized videos,
 * kinematic data, and visualization data.
 */
export interface ActivityResult {
    id: number;
    activity: string;
    tag?: string;
    media?: string;
}
/**
 * Processing status of an activity.
 *
 * Indicates the current state of video upload and processing.
 */
export type ActivityProcessingStatus = {
    type: "uploading";
    uploaded: number;
    total: number;
} | {
    type: "processing";
} | {
    type: "ready";
} | {
    type: "failed";
};
/**
 * Video version types available for download.
 */
export type VideoVersion = "raw" | "synced";
/**
 * Result data types available for download from activities, including the desired file format.
 *
 * Each variant encodes both the data type and the requested format, matching
 * the `ResultDataTypeWire` discriminants used in the Rust core:
 * - `"animation"` — JSON only
 * - `"kinematics_mot"` — Kinematics in OpenSim MOT format
 * - `"kinematics_csv"` — Kinematics in CSV format
 * - `"markers_trc"` — Marker trajectories in TRC format
 * - `"markers_csv"` — Marker trajectories in CSV format
 * - `"model"` — OpenSim model (.osim), only available in neutral activities
 */
export type ResultDataType = "animation" | "kinematics_mot" | "kinematics_csv" | "markers_trc" | "markers_csv" | "model";
/**
 * File format types for downloaded result data.
 */
export type FileType = "json" | "csv" | "mot" | "trc" | "o_sim";
/**
 * Downloaded result data from an activity.
 *
 * The `result_data_type` identifies both what was requested and the implicit
 * file format — use it to determine how to parse `data`.
 */
export interface ResultData {
    result_data_type: ResultDataType;
    data: Uint8Array;
}
/**
 * Type of analysis result data to download from a completed activity.
 *
 * The file format is implicit in the type:
 * - `"metrics"` — JSON containing computed biomechanical metrics
 * - `"data"` — ZIP containing raw analysis data
 * - `"report"` — PDF report
 */
export type AnalysisResultDataType = 
/** Computed biomechanical metrics. Always JSON format. */
"metrics"
/** Raw analysis data. Always ZIP format. */
 | "data"
/** Analysis report. Always PDF format. */
 | "report";
/**
 * Downloaded analysis result data from a completed activity.
 *
 * The `result_data_type` identifies both what was requested and the implicit
 * file format — use it to determine how to parse `data`.
 */
export interface AnalysisResultData {
    result_data_type: AnalysisResultDataType;
    data: Uint8Array;
}
/**
 * Orientation of the checkerboard during camera calibration.
 */
export type CheckerboardPlacement = "perpendicular" | "parallel";
/**
 * Configuration for checkerboard-based camera calibration.
 */
export interface CheckerboardDetails {
    rows: number;
    columns: number;
    square_size: number;
    placement: CheckerboardPlacement;
}
/**
 * Status updates during calibration process.
 */
export type CalibrationStatus = {
    type: "recording";
} | {
    type: "uploading";
    uploaded: number;
    total: number;
} | {
    type: "processing";
    percent?: number;
} | {
    type: "done";
};
/**
 * Represents available analysis functions for motion capture data.
 *
 * Each analysis type processes activity data to extract specific biomechanical metrics
 * and insights. Analysis can only be performed on activities that have completed processing.
 */
export declare const AnalysisType: {
    /** Counter Movement Jump */
    readonly CounterMovementJump: "counter_movement_jump";
    /** Overground Walking */
    readonly Gait: "gait";
    /** Treadmill Running */
    readonly TreadmillRunning: "treadmill_running";
    /** Sit-to-Stand Transfer */
    readonly SitToStand: "sit_to_stand";
    /** Squat Exercise */
    readonly Squats: "squats";
    /** Range of Motion (ROM) */
    readonly RangeOfMotion: "range_of_motion";
    /** Overground Running */
    readonly OvergroundRunning: "overground_running";
    /** Drop Vertical Jump */
    readonly DropJump: "drop_jump";
    /** Hop Test */
    readonly Hop: "hop";
    /** Treadmill Walking */
    readonly TreadmillGait: "treadmill_gait";
    /** 5-0-5 Test */
    readonly ChangeOfDirection: "change_of_direction";
    /** Cutting Maneuver */
    readonly Cut: "cut";
};
export type AnalysisType = (typeof AnalysisType)[keyof typeof AnalysisType];
/**
 * Identifier for a running analysis task.
 */
export interface AnalysisTask {
    task_id: string;
}
/**
 * Status of an analysis task.
 */
export type AnalysisTaskStatus = {
    type: "processing";
} | {
    type: "completed";
} | {
    type: "failed";
};
/**
 * Results from a biomechanical analysis.
 *
 * Contains computed metrics like jump height, peak velocities,
 * asymmetries, and other biomechanical parameters.
 */
export interface AnalysisResult {
    analysis_title: string;
    analysis_description: string;
    metrics: Record<string, Metric>;
}
/**
 * Individual biomechanical metric from an analysis.
 */
export interface Metric {
    label: string;
    bilateral: boolean;
    value: MetricValue;
    info: string;
    decimal_places: number;
}
/**
 * Value of a metric (single measurement or bilateral left/right).
 */
export type MetricValue = {
    type: "single";
    value: number;
} | {
    type: "bilateral";
    left: number;
    right: number;
};
/**
 * Interface for storing authentication tokens securely.
 *
 * Implement this interface to provide custom token storage
 * (e.g., encrypted storage, secure cookies, etc.)
 *
 * @example
 * ```typescript
 * class SecureTokenStorage implements TokenStorage {
 *   async getToken(): Promise<string | null> {
 *     // Retrieve from encrypted storage
 *   }
 *   async setToken(token: string): Promise<void> {
 *     // Store in encrypted storage
 *   }
 *   async removeToken(): Promise<void> {
 *     // Remove from storage
 *   }
 * }
 * ```
 */
export interface TokenStorage {
    /**
     * Retrieve the stored authentication token.
     *
     * @returns The token string, or null if no token is stored
     */
    getToken(): Promise<string | null>;
    /**
     * Store an authentication token securely.
     *
     * @param token The token to store
     */
    setToken(token: string): Promise<void>;
    /**
     * Remove the stored authentication token.
     */
    removeToken(): Promise<void>;
}
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
export declare class MemoryTokenStorage implements TokenStorage {
    private token;
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
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
export declare class LocalStorageTokenStorage implements TokenStorage {
    private key;
    /**
     * Create a LocalStorage token storage.
     *
     * @param key Storage key name (default: "modelhealth_token")
     */
    constructor(key?: string);
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
}
/**
 * Extract jump height from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Jump height in centimeters, or null if not available
 */
export declare function getJumpHeight(result: AnalysisResult): number | null;
/**
 * Extract jump time from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Jump time in seconds, or null if not available
 */
export declare function getJumpTime(result: AnalysisResult): number | null;
/**
 * Extract concentric/eccentric time ratio from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Time ratio, or null if not available
 */
export declare function getConcentricEccentricTimeRatio(result: AnalysisResult): number | null;
/**
 * Extract reactive strength index from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Reactive strength index, or null if not available
 */
export declare function getReactiveStrengthIndex(result: AnalysisResult): number | null;
/**
 * Extract peak vertical velocity from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Peak velocity in m/s, or null if not available
 */
export declare function getPeakVerticalVelocity(result: AnalysisResult): number | null;
/**
 * Extract peak knee extension speed during takeoff from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in deg/s, or null if not available
 */
export declare function getPeakKneeExtensionSpeed(result: AnalysisResult): {
    left: number;
    right: number;
} | null;
/**
 * Extract peak hip extension speed during takeoff from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in deg/s, or null if not available
 */
export declare function getPeakHipExtensionSpeed(result: AnalysisResult): {
    left: number;
    right: number;
} | null;
/**
 * Extract peak knee flexion angle during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in degrees, or null if not available
 */
export declare function getPeakKneeFlexionLanding(result: AnalysisResult): {
    left: number;
    right: number;
} | null;
/**
 * Extract peak knee valgus angle during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in degrees, or null if not available
 */
export declare function getPeakKneeValgusLanding(result: AnalysisResult): {
    left: number;
    right: number;
} | null;
/**
 * Extract peak hip flexion angle during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in degrees, or null if not available
 */
export declare function getPeakHipFlexionLanding(result: AnalysisResult): {
    left: number;
    right: number;
} | null;
/**
 * Extract peak trunk flexion during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Trunk flexion angle in degrees, or null if not available
 */
export declare function getPeakTrunkFlexionLanding(result: AnalysisResult): number | null;
/**
 * Extract peak trunk lean during landing from CMJ analysis results.
 *
 * @param result Analysis result from counter-movement jump
 * @returns Trunk lean angle in degrees, or null if not available
 */
export declare function getPeakTrunkLeanLanding(result: AnalysisResult): number | null;
//# sourceMappingURL=types.d.ts.map