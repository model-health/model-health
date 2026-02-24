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
    sessionName: string;
    qrcode?: string;
    activities: Activity[];
    subject?: number;
    activitiesCount: number;
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
    birthYear?: number;
    gender: Gender;
    sexAtBirth: Sex;
    characteristics: string;
    subjectTags: string[];
}
/**
 * Parameters required for creating a new subject.
 */
export interface SubjectParameters {
    name: string;
    weight: number;
    height: number;
    birthYear: number;
    sexAtBirth: Sex;
    gender: Gender;
    characteristics: string;
    subjectTags: string[];
    terms: boolean;
}
/**
 * Video file associated with an activity.
 */
export interface Video {
    id: string;
    activity: string;
    video?: string;
    videoThumb?: string;
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
 * The `resultDataType` identifies both what was requested and the implicit
 * file format — use it to determine how to parse `data`.
 */
export interface ResultData {
    resultDataType: ResultDataType;
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
 * The `resultDataType` identifies both what was requested and the implicit
 * file format — use it to determine how to parse `data`.
 */
export interface AnalysisResultData {
    resultDataType: AnalysisResultDataType;
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
    squareSize: number;
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
    taskId: string;
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
//# sourceMappingURL=types.d.ts.map