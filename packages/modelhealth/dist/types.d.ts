/**
 * Model Health SDK TypeScript Types
 *
 * Complete type definitions for the Model Health biomechanics SDK.
 *
 * @packageDocumentation
 */
/**
 * A parent container for a movement capture workflow.
 *
 * Sessions link related entities such as activities and subjects and provide
 * the context used by subsequent operations.
 *
 * Create a session with `createSession()` before performing
 * subsequent operations like camera calibration.
 *
 * When connecting or re-connecting to a Session, use `qrcode` to retrieve
 * the QR code image for pairing cameras.
 *
 * @example
 * ```typescript
 * const session = await client.createSession();
 * await client.calibrateCamera(session, details, () => {});
 * ```
 */
export interface Session {
    id: string;
    user: number;
    public: boolean;
    name: string;
    sessionName: string;
    qrcode?: string;
    activities: Activity[];
    /** ID of the subject this session belongs to, if assigned. A bare ID, not a
     * {@link Subject} object. */
    subject?: number;
    activitiesCount: number;
    /** When this session was created. */
    createdAt: Date;
    /** When this session was last updated. */
    updatedAt: Date;
}
/**
 * Sort field for {@link SessionsResource.list}, optionally `-`-prefixed for descending.
 *
 * @group Enumerations
 */
export type SessionOrderBy = "name" | "-name" | "createdAt" | "-createdAt";
/**
 * Named filters for {@link SessionsResource.list}.
 *
 * All fields are optional — omit any to leave that filter unconstrained.
 *
 * @group Enumerations
 */
export interface SessionListOptions {
    /** Only the session(s) belonging to this subject. Accepts a {@link Subject} or its id. */
    subject?: Subject | number;
    /** Field to sort by. Defaults to `"-createdAt"`. */
    orderBy?: SessionOrderBy;
    /** Caps the total number of sessions the stream yields across the whole
     * iteration. Omit to iterate every match. */
    limit?: number;
}
/**
 * Gender identity options for subject demographics.
 *
 * @group Enumerations
 */
export type Gender = "woman" | "man" | "transgender" | "non_binary" | "no_response";
/**
 * Sex assigned at birth options for subject demographics.
 *
 * @group Enumerations
 */
export type Sex = "woman" | "man" | "intersex" | "not_listed" | "no_response";
/**
 * Why recording is currently blocked.
 *
 * @group Enumerations
 */
export type UsageReason = "no_active_plan" | "period_expired" | "limit_reached" | "payment_failed";
/**
 * How often a plan's usage period resets.
 *
 * @group Enumerations
 */
export type ResetPeriod = "monthly" | "annually";
/**
 * An individual being monitored or assessed.
 *
 * @example
 * ```typescript
 * for await (const subject of client.subjects.list()) {
 *   console.log(subject.name);
 * }
 * ```
 */
export interface Subject {
    id: number;
    name: string;
    weight?: number;
    /** Centimeters. */
    height?: number;
    age?: number;
    birthYear?: number;
    /** Gender identity as reported, or `undefined` if the subject declined to answer or no value is available. */
    gender?: Gender;
    /** Sex assigned at birth as reported, or `undefined` if the subject declined to answer or no value is available. */
    sexAtBirth?: Sex;
    characteristics: string;
    /** Given name, if reported. Not always available. */
    firstName?: string;
    /** Family name, if reported. Not always available. */
    lastName?: string;
    /** Tags attached to the subject. */
    tags: string[];
    /** Number of activities recorded, excluding calibration and neutral trials.
     * `undefined` if not reported.
     */
    activityCount?: number;
    /** Timestamp of the subject's most recent activity, if they have one and it was
     * reported. */
    lastActivity?: Date;
    /** When this subject record was created, if reported. */
    createdAt?: Date;
    /** When this subject record was last modified, if reported. */
    updatedAt?: Date;
}
/**
 * Parameters for creating a new subject.
 *
 * `name`, `weight` and `height`` are required.
 *
 * @example
 * ```typescript
 * const params: SubjectParameters = {
 *   name: "John Smith",
 *   weight: 75,
 *   height: 180,
 *   birthYear: 1990,
 * };
 *
 * const subject = await client.createSubject(params);
 * ```
 */
export interface SubjectParameters {
    name: string;
    weight: number;
    height: number;
    birthYear?: number;
    sexAtBirth?: Sex;
    gender?: Gender;
    characteristics?: string;
}
/**
 * Sort field for {@link SubjectsResource.list}, optionally `-`-prefixed for descending.
 *
 * @group Enumerations
 */
export type SubjectOrderBy = "name" | "-name" | "createdAt" | "-createdAt" | "updatedAt" | "-updatedAt";
/**
 * Named filters for {@link SubjectsResource.list}.
 *
 * All fields are optional — omit any to leave that filter unconstrained.
 *
 * @group Enumerations
 */
export interface SubjectListOptions {
    /** Free-text search against the subject's name. */
    search?: string;
    /** Only subjects created on or after this date (inclusive). A `Date` counts as
     * the day it falls on in the local time zone, not in UTC. A string must read
     * `YYYY-MM-DD`. */
    createdAfter?: Date | string;
    /** Only subjects created on or before this date (inclusive). A `Date` counts as
     * the day it falls on in the local time zone, not in UTC. A string must read
     * `YYYY-MM-DD`. */
    createdBefore?: Date | string;
    /** Only subjects belonging to one of these subject groups (group ids as strings). */
    groups?: string[];
    /** Only subjects carrying every tag in this list. */
    tags?: string[];
    /** Only subjects belonging to one of these accounts, by numeric account id. */
    createdBy?: number[];
    /** Only subjects with at least one activity of this type. Accepts a type from
     * {@link ModelHealthClient.activityTypes} or its id. */
    activityType?: ActivityTypeInfo | number;
    /** Only subjects whose activities have (`true`) or have not (`false`) all
     * finished analysis. */
    activityComplete?: boolean;
    /** Only the subject calibrated under this session. Accepts a {@link Session} or its id. */
    session?: Session | string;
    /** Field to sort by. Defaults to `"name"`. */
    orderBy?: SubjectOrderBy;
    /** Caps the total number of subjects the stream yields across the whole
     * iteration. Omit to iterate every match. */
    limit?: number;
}
/**
 * A named collection of subjects.
 *
 * @example
 * ```typescript
 * for await (const group of client.groups.list()) {
 *   console.log(group.name, group.subjectCount);
 * }
 * ```
 */
export interface SubjectGroup {
    id: number;
    name: string;
    /** Freeform description, or an empty string if none was set. */
    description: string;
    /** Number of subjects in this group. */
    subjectCount: number;
    /** Total activities recorded across every subject in this group. */
    totalActivities: number;
    /** Timestamp of the most recent activity across the group, if there is one. */
    lastActivity?: Date;
    /** Username of the account that created this group, if reported. */
    createdBy?: string;
    /** Whether the authenticated account owns this group. */
    isOwner: boolean;
    /** Whether the authenticated account can edit this group. */
    canEdit: boolean;
    /** When the group was created. */
    createdAt: Date;
    /** When the group was last modified. */
    updatedAt: Date;
    /** Whether the group is in the trash. */
    trashed: boolean;
    /** When the group was trashed, if it is. */
    trashedAt?: Date;
}
/**
 * Sort field for {@link GroupsResource.list}, optionally `-`-prefixed for descending.
 *
 * @group Enumerations
 */
export type GroupOrderBy = "name" | "-name";
/**
 * Named filters for {@link GroupsResource.list}.
 *
 * All fields are optional — omit any to leave that filter unconstrained.
 *
 * @group Enumerations
 */
export interface GroupListOptions {
    /** Free-text search against the group's name. */
    search?: string;
    /** Field to sort by. Defaults to `"name"`. */
    orderBy?: GroupOrderBy;
    /** Caps the total number of groups the stream yields across the whole
     * iteration. Omit to iterate every match. */
    limit?: number;
}
/**
 * A recorded video file from an activity.
 *
 * Videos are automatically uploaded to the cloud during recording.
 * Use `video` as the URL for the full video.
 */
export interface Video {
    id: string;
    activity: string;
    video?: string;
    videoThumb?: string;
}
/**
 * A movement recording trial with associated videos and results.
 *
 * Activities represent individual recording trials and contain references to
 * captured videos and results.
 *
 * @example
 * ```typescript
 * const activities = await client.activityList(session.id);
 * for (const activity of activities) {
 *   console.log(`${activity.name ?? activity.id}: ${activity.status}`);
 * }
 * ```
 */
export interface Activity {
    id: string;
    /** ID of the parent session. A bare ID, not a {@link Session} object. */
    session: string;
    name?: string;
    status: string;
    videos: Video[];
    results: ActivityResult[];
    /** The activity type as reported, if one was set.
     *
     * Carries `{id, name, displayName}` through unchanged — including a type this
     * SDK build doesn't recognize.
     */
    activityType?: ActivityTypeInfo;
    /** Tags attached to the activity. */
    tags: string[];
    /** Free-text notes attached to the activity, if any. */
    notes?: string;
    /** Username of the account that owns the parent session, if known. */
    createdBy?: string;
    /** State of the analysis pipeline: `"processing"`, `"done"`, `"error"`, or
     * `undefined` when this activity was not loaded through a path that reports it
     * (for example, nested inside a session).
     */
    analysisStatus?: string;
    /** Whether the activity is in the trash. */
    trashed: boolean;
    /** When this activity was created. */
    createdAt: Date;
    /** When this activity was last updated. */
    updatedAt: Date;
}
/** The activity type as reported, carrying `{id, name, slug, displayName}` through
 * unchanged — including a type this SDK build doesn't otherwise recognize.
 */
export interface ActivityTypeInfo {
    id: number;
    /** Machine name, e.g. `"counter_movement_jump"`. */
    name: string;
    /** Human-readable label, e.g. `"Counter Movement Jump"`. */
    displayName: string;
    /**
     * Machine-readable key, e.g. `"squat_exercise"`.
     *
     * What to branch on: it is derived from the name once and then stays put, so
     * renaming the type in the dashboard does not change it, while `name` and
     * `displayName` both can. Empty when none was reported.
     */
    slug: string;
    /** Freeform description, or `null` on a type reported alongside an activity. */
    description: string | null;
    /**
     * Whether the type belongs to the account rather than being one everybody has,
     * or `null` on a type reported alongside an activity.
     */
    isCustom: boolean | null;
}
/**
 * Field to sort `client.activities.list(...)` results by, optionally prefixed
 * with `"-"` for descending.
 *
 * @group Enumerations
 * @example
 * ```typescript
 * const activities = client.activities.list({ orderBy: "-createdAt" });
 * ```
 */
export type ActivityOrderBy = "createdAt" | "-createdAt" | "status" | "-status" | "createdBy" | "-createdBy" | "activityType" | "-activityType";
/**
 * Named filters for {@link ActivitiesResource.list}.
 *
 * All fields are optional — omit any to leave that filter unconstrained.
 *
 * @group Enumerations
 */
export interface ActivityListOptions {
    /** Only activities belonging to this subject. Accepts a {@link Subject} or its id. */
    subject?: Subject | number;
    /** Only activities recorded under this calibration session. Accepts a {@link Session} or its id. */
    calibrationSession?: Session | string;
    /** Only activities of this type. Accepts a type from
     * {@link ModelHealthClient.activityTypes} or its id. */
    activityType?: ActivityTypeInfo | number;
    /** Excludes calibration and neutral-pose activities. Default `true`. */
    excludeCalibration?: boolean;
    /** Only activities created on or after this date (inclusive). A `Date` counts as
     * the day it falls on in the local time zone, not in UTC. A string must read
     * `YYYY-MM-DD`. */
    createdAfter?: Date | string;
    /** Only activities created on or before this date (inclusive). A `Date` counts as
     * the day it falls on in the local time zone, not in UTC. A string must read
     * `YYYY-MM-DD`. */
    createdBefore?: Date | string;
    /** Free-text search against the activity's name. */
    search?: string;
    /** Only activities carrying every tag in this list. */
    tags?: string[];
    /** Only activities belonging to one of these accounts, by numeric account id.*/
    createdBy?: number[];
    /** Only activities whose analysis has finished. */
    onlyCompleted?: boolean;
    /** Excludes activities whose analysis failed. */
    excludeAnalysisError?: boolean;
    /** Field to sort by. Defaults to `"-createdAt"`. */
    orderBy?: ActivityOrderBy;
    /** Caps the total number of activities the stream yields across the whole
     * iteration. Omit to iterate every match. */
    limit?: number;
}
/**
 * A tag that can be applied to activities for categorization.
 *
 * Use tags to organize and filter activities by type or condition
 * (for example, `"cmj"`, `"squat"`, `"baseline"`).
 *
 * @example
 * ```typescript
 * const tags = await client.activityTags();
 * const cmjTag = tags.find(t => t.value === "cmj");
 * console.log(`CMJ activities: ${cmjTag?.label ?? ""}`);
 * ```
 */
export interface ActivityTag {
    /** Machine-readable tag identifier. */
    value: string;
    /** The human-readable display label. */
    label: string;
}
/**
 * A processed result file associated with an activity.
 */
export interface ActivityResult {
    id: number;
    activity: string;
    tag?: string;
    media?: string;
}
/**
 * The current processing state of an activity.
 *
 * Activities must reach `ready` before analysis can begin.
 */
export type ActivityStatus = 
/** Videos are being uploaded. `uploaded` and `total` track progress. */
{
    type: "uploading";
    uploaded: number;
    total: number;
}
/** Videos have been uploaded and are being processed. */
 | {
    type: "processing";
}
/** Processing is complete. The activity is ready for analysis. */
 | {
    type: "ready";
}
/**
 * Analysis has been triggered automatically and is in progress.
 * Pass `taskId` to `analysisStatus` to track progress.
 */
 | {
    type: "analyzing";
    taskId: string;
}
/** Processing failed. */
 | {
    type: "failed";
};
/**
 * Video version types available for download.
 *
 * The processing version of the video to retrieve from an activity.
 *
 * - `"raw"`: The original, unprocessed video as captured or uploaded.
 *   Raw videos represent the source material before synchronization.
 * - `"synced"`: Videos that have been synchronized.
 *   Synced videos have undergone processing and may include temporal alignment.
 *
 * @group Enumerations
 */
export type VideoVersion = "raw" | "synced";
/**
 * The type of motion result data to retrieve from a processed activity, including the desired file format.
 *
 * @example
 * ```typescript
 * // Download animation data (JSON only)
 * const animationData = await client.motionDataForActivity(activity, ["animation"]);
 *
 * // Download kinematics in MOT format
 * const motData = await client.motionDataForActivity(activity, ["kinematics_mot"]);
 *
 * // Download kinematics in both MOT and CSV formats
 * const bothFormats = await client.motionDataForActivity(activity, ["kinematics_mot", "kinematics_csv"]);
 * ```
 *
 * - `"animation"` — JSON only
 * - `"kinematics_mot"` — Kinematics in OpenSim MOT format
 * - `"kinematics_csv"` — Kinematics in CSV format
 * - `"markers_trc"` — Marker trajectories in TRC format
 * - `"markers_csv"` — Marker trajectories in CSV format
 * - `"model"` — OpenSim model (.osim), only available in neutral activities
 *
 * `kinematics_*` types are only available in dynamic activities.
 *
 * @group Enumerations
 */
export type MotionDataType = "animation" | "kinematics_mot" | "kinematics_csv" | "markers_trc" | "markers_csv" | "model" | {
    type: "tagged";
    tag: string;
    extension: string;
};
/**
 * Motion data downloaded from a processed activity.
 *
 * Each instance carries the `type` that was requested, which also
 * implies the file format. Use `type` to determine how to parse `data`.
 *
 * @example
 * ```typescript
 * const results = await client.motionDataForActivity(activity, ["kinematics_mot"]);
 *
 * for (const result of results) {
 *   // result.type identifies both the type and implicit file format
 *   // Use result.data directly as a .mot file
 * }
 * ```
 */
export interface MotionData {
    /** The type of result data and its file format. */
    type: MotionDataType;
    /** The raw file data. Parse according to the format implied by `type`. */
    data: Uint8Array;
}
/**
 * An external file to attach to an activity via `addMotionDataToActivity`.
 *
 * The `tag` must not conflict with reserved tags used by Model Health internally.
 *
 * @example
 * ```typescript
 * const file: ExternalResultFile = {
 *   tag: "force_plate",
 *   extension: "csv",
 *   data: new TextEncoder().encode("time,fx,fy,fz\n0.0,0,0,650\n"),
 * };
 * const updated = await client.addMotionDataToActivity(activity, [file]);
 * ```
 */
export interface ExternalResultFile {
    /** Identifies the data source. */
    tag: string;
    /** Bare file extension without a leading dot (e.g. `"csv"`, `"bin"`, `"json"`). */
    extension: string;
    /** The raw file bytes to upload. */
    data: Uint8Array;
}
/**
 * Type of analysis result data to download from an activity with a completed analysis.
 *
 * @example
 * ```typescript
 * const results = await client.analysisDataForActivity(activity, ["metrics", "report"]);
 * ```
 *
 * The file format is implicit in the type:
 *
 * - `"metrics"` — JSON containing computed biomechanical metrics
 * - `"data"` — ZIP containing extended analysis data
 * - `"report"` — PDF report
 *
 * @group Enumerations
 */
export type AnalysisDataType = 
/** Computed biomechanical metrics. Always JSON format. */
"metrics"
/** Extended analysis data. Always ZIP format. */
 | "data"
/** Analysis report. Always PDF format. */
 | "report";
/**
 * Analysis result data downloaded from an activity with a completed analysis.
 *
 * Use `type` to determine how to parse `data`.
 *
 * @example
 * ```typescript
 * const results = await client.analysisDataForActivity(activity, ["metrics", "report", "data"]);
 *
 * for (const result of results) {
 *   switch (result.type) {
 *     case "metrics":
 *       // Decode result.data as JSON
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
 */
export interface AnalysisData {
    /** The type of analysis result. Use this to determine how to parse `data`. */
    type: AnalysisDataType;
    /** The raw file data. Parse according to the format implied by `type`. */
    data: Uint8Array;
}
/**
 * Orientation of the calibration checkerboard relative to the camera.
 *
 * @example
 * ```typescript
 * const details: CheckerboardDetails = {
 *   rows: 4,
 *   columns: 5,
 *   squareSize: 35,
 *   placement: "perpendicular"
 * };
 * ```
 *
 * @group Enumerations
 */
export type CheckerboardPlacement = 
/** Checkerboard upright (vertical), so its plane is perpendicular to the ground. */
"perpendicular"
/** Checkerboard flat on the floor, so its plane is parallel to the ground. */
 | "parallel";
/**
 * Configuration for a calibration checkerboard pattern.
 *
 * > Note: `rows` and `columns` refer to internal corners, not squares.
 * > For a standard 5×6 checkerboard, use `rows: 4` and `columns: 5`.
 * > `squareSize` must be measured precisely in millimeters for accurate calibration.
 *
 * @example
 * ```typescript
 * const details: CheckerboardDetails = {
 *   rows: 4,
 *   columns: 5,
 *   squareSize: 35,
 *   placement: "perpendicular"
 * };
 * await client.calibrateCamera(session, details, () => {});
 * ```
 */
export interface CheckerboardDetails {
    /** Number of internal corner rows. For a 5×6 checkerboard, use `4`. */
    rows: number;
    /** Number of internal corner columns. For a 5×6 checkerboard, use `5`. */
    columns: number;
    /** Size of each square in millimeters. Must be measured precisely. */
    squareSize: number;
    /** Checkerboard orientation relative to the ground. */
    placement: CheckerboardPlacement;
}
/**
 * The current status of a calibration process.
 *
 * Reported during both camera calibration and subject calibration,
 * tracking recording, uploading and processing stages.
 *
 * @example
 * ```typescript
 * await client.calibrateSubject(subject, session, (status) => {
 *   switch (status.type) {
 *     case "recording":
 *       console.log("Recording...");
 *       break;
 *     case "uploading":
 *       console.log(`Uploading: ${status.uploaded}/${status.total}`);
 *       break;
 *     case "processing":
 *       console.log(`Processing: ${status.percent ?? 0}%`);
 *       break;
 *     case "done":
 *       console.log("Complete!");
 *       break;
 *   }
 * });
 * ```
 */
export type CalibrationStatus = 
/** All connected cameras are actively recording. */
{
    type: "recording";
}
/** Videos are being uploaded from cameras. */
 | {
    type: "uploading";
    uploaded: number;
    total: number;
}
/** The uploaded videos are being processed. */
 | {
    type: "processing";
    percent?: number;
}
/** Calibration has completed successfully. */
 | {
    type: "done";
};
/**
 * Available analysis types for motion capture activities.
 *
 * Analysis can only be performed on activities that have reached `ready` status.
 *
 * @example
 * ```typescript
 * const task = await client.startAnalysis("counter_movement_jump", activity, session);
 * const status = await client.analysisStatus(task);
 * ```
 *
 * @group Enumerations
 */
export declare const ActivityType: {
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
    /** Sprint */
    readonly Sprint: "sprint";
    /** Lateral Stepdown */
    readonly LateralStepdown: "lateral_stepdown";
    /** Lunge */
    readonly Lunge: "lunge";
};
/** @hidden */
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
/**
 * Controls whether a user's devices upload recorded video.
 *
 * @example
 * ```typescript
 * await client.setVideoUploadMode("disabled");
 * ```
 *
 * @group Enumerations
 */
export declare const VideoUploadMode: {
    /** Devices upload recorded video normally. */
    readonly Enabled: "enabled";
    /** Devices stop uploading recorded video. */
    readonly Disabled: "disabled";
    /** Re-enables uploads, and uploads any videos that were queued locally while disabled. */
    readonly Flush: "flush";
};
/** @hidden */
export type VideoUploadMode = (typeof VideoUploadMode)[keyof typeof VideoUploadMode];
/**
 * Per-recording settings that override the session-level config.
 *
 * Fields left undefined fall back to the session's configured values.
 *
 * @group Configuration
 */
export interface RecordingConfig {
    /** Camera frame rate override. Undefined uses the session default. */
    framerate?: SessionFramerate;
    /** Low-pass filter frequency override. Undefined uses the session default. */
    filterFrequency?: FilterFrequency;
}
/**
 * Configuration for starting or updating a recording.
 *
 * @group Configuration
 */
export interface ActivityConfig {
    /**
     * The type of activity being recorded. When set, the corresponding analysis
     * starts automatically once recording is processed.
     */
    activityType?: ActivityType;
    /**
     * Per-recording settings that override the session-level config.
     */
    config?: RecordingConfig;
    /**
     * Tags to add to the activity. Merged with existing tags.
     */
    addTags?: string[];
    /**
     * Tags to remove from the activity.
     */
    removeTags?: string[];
    /**
     * New display name to set on the activity.
     */
    name?: string;
}
/**
 * An active analysis returned by `startAnalysis`.
 *
 * Pass this value to `analysisStatus` to poll for completion.
 */
export interface Analysis {
    /** Unique task identifier for the active analysis. */
    taskId: string;
}
/**
 * The current state of an analysis.
 */
export type AnalysisStatus = 
/** Analysis is in progress. */
{
    type: "processing";
}
/** Analysis completed successfully. */
 | {
    type: "completed";
}
/** Analysis failed. */
 | {
    type: "failed";
};
/**
 * An active archive preparation task returned by `prepareArchive`.
 *
 * Pass this value to `archiveStatus` to poll for readiness, then to
 * `archiveData` to download the ZIP file.
 */
export interface Archive {
    /** Opaque identifier for the archive preparation task. */
    archiveId: string;
}
/**
 * The current state of an archive preparation task.
 */
export type ArchiveStatus = 
/** The archive is being prepared. */
{
    type: "processing";
}
/** The archive is ready to download. */
 | {
    type: "ready";
}
/** The archive preparation failed. */
 | {
    type: "failed";
};
/**
 * The current status of a session import.
 *
 * Reported during `importSession`, tracking session creation, video upload
 * and processing stages.
 *
 * @example
 * ```typescript
 * await client.importSession(activitiesJson, subject, null, {}, (status) => {
 *   switch (status.type) {
 *     case "creating_session":
 *       console.log("Creating session...");
 *       break;
 *     case "uploading_video":
 *       console.log(`[${status.trial}] Uploading: ${status.uploaded}/${status.total}`);
 *       break;
 *     case "processing":
 *       console.log("Processing...");
 *       break;
 *   }
 * });
 * ```
 */
export type ImportStatus = 
/** A new session is being created. */
{
    type: "creating_session";
}
/** The session was created successfully. */
 | {
    type: "created_session";
    session_id: string;
}
/** A video is being uploaded. `trial` names the current trial. */
 | {
    type: "uploading_video";
    trial: string;
    uploaded: number;
    total: number;
}
/** Videos have been uploaded and the trial is being processed. */
 | {
    type: "processing";
};
/**
 * Camera frame rate for a recording session.
 *
 * Higher framerates capture fast movements more accurately but increase
 * processing time proportionally. Collect only as much footage as needed
 * and keep recordings under the suggested durations:
 * - `60` fps — suggested maximum: 60 s
 * - `120` fps — suggested maximum: 30 s (default)
 * - `240` fps — suggested maximum: 15 s
 *
 * @group Enumerations
 */
export type SessionFramerate = 60 | 120 | 240;
/**
 * OpenSim musculoskeletal model used for biomechanical analysis.
 *
 * - `"LaiUhlrich2022_shoulder"` — Full-body model with 33 degrees of freedom
 *   plus a 6-DoF shoulder complex with a scapulothoracic body and a glenohumeral joint
 *   using the ISB-recommended Y-X-Y rotation sequence.
 * - `"LaiUhlrich2022"` (default) — Same full-body model without the ISB shoulder complex.
 *
 * @group Enumerations
 */
export type SessionOpenSimModel = "LaiUhlrich2022_shoulder" | "LaiUhlrich2022";
/**
 * Pose used for subject scaling during calibration.
 *
 * - `"upright_standing_pose"` (default) — Subject stands straight with feet pointing
 *   forward and no bending or rotation at the hips, knees, or ankles.
 * - `"any_pose"` — No posture assumptions. Use when the subject cannot adopt the upright
 *   standing pose. Requires all body segments to be visible by at least two cameras.
 *
 * @group Enumerations
 */
export type SessionScalingSetup = "upright_standing_pose" | "any_pose";
/**
 * Core processing engine version.
 *
 * `"v1.0"` is the default.
 *
 * @group Enumerations
 */
export type SessionCoreEngine = "v0.2" | "v0.3" | "v1.0";
/**
 * Frequency of the low-pass Butterworth filter applied to 2D video keypoints.
 *
 * Use `{ type: "default" }` for the automatically chosen optimal frequency
 * (usually 20 Hz), or `{ type: "hz", value: N }` to specify a frequency in Hz.
 * A custom value applies to all motion trials in the session. Per the Nyquist
 * theorem the value must be less than half the session framerate; a higher
 * value is clamped automatically.
 *
 * @example
 * ```typescript
 * // Automatically chosen frequency
 * const freq: FilterFrequency = { type: "default" };
 *
 * // Explicit 6 Hz
 * const freq: FilterFrequency = { type: "hz", value: 6 };
 * ```
 *
 * @group Enumerations
 */
export type FilterFrequency = 
/** Use the automatically chosen optimal filter frequency. Usually 20 Hz. */
{
    type: "default";
}
/** A specific frequency in Hz. */
 | {
    type: "hz";
    value: number;
};
/**
 * Data-sharing preference for a session.
 *
 * Session data and videos are uploaded securely to Model Health for processing.
 * This setting controls what Model Health can use for internal development.
 * Identified videos contain original footage with faces unblurred; de-identified
 * videos have faces blurred. Processed data (e.g. joint angles) is always
 * de-identified.
 *
 * @group Enumerations
 */
export type SessionDataSharing = 
/** Share processed data and identified videos (default). */
"Share processed data and identified videos"
/** Share processed data and de-identified videos (faces blurred). */
 | "Share processed data and de-identified videos"
/** Share processed data only. No videos are shared. */
 | "Share processed data"
/** Share no data for internal development. */
 | "Share no data";
/**
 * Settings applied to a session before calibration and recording.
 *
 * All fields are optional — omit any field to use its default value.
 *
 * @example
 * ```typescript
 * // All defaults
 * await client.configureSession(session, {});
 *
 * // Override frame rate and data sharing only
 * await client.configureSession(session, {
 *   framerate: 60,
 *   dataSharing: "Share no data"
 * });
 * ```
 */
export interface SessionConfig {
    /** Camera frame rate in fps. Default: `120`. */
    framerate?: SessionFramerate;
    /** OpenSim musculoskeletal model. Default: `"LaiUhlrich2022"`. */
    opensimModel?: SessionOpenSimModel;
    /** Pose used for subject scaling. Default: `"upright_standing_pose"`. */
    scalingSetup?: SessionScalingSetup;
    /** Core processing engine version. Default: `"v1.0"`. */
    coreEngine?: SessionCoreEngine;
    /** Low-pass filter frequency. Default: `{ type: "default" }`. */
    filterFrequency?: FilterFrequency;
    /** Data-sharing preference. Default: `"Share processed data and identified videos"`. */
    dataSharing?: SessionDataSharing;
}
/** The measured value(s) for a metric. */
export type MetricValue = {
    type: 'scalar';
    value?: number;
} | {
    type: 'bilateral';
    left?: number;
    right?: number;
};
/** A single computed biomechanical metric for one activity. */
export interface Metric {
    name: string;
    description?: string;
    value: MetricValue;
}
/** A category group that organizes related metrics on a dashboard. */
export interface MetricsGroup {
    name: string;
    description?: string;
    metrics: Metric[];
}
/** All dashboard metrics for a single activity, organized into category groups. */
export interface ActivityMetrics {
    activityId: string;
    activityTypeId: number;
    groups: MetricsGroup[];
}
/**
 * Identity information for the authenticated account.
 *
 * Returned by `ModelHealthClient.accountInfo()`.
 */
export interface AccountInfo {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    institution?: string;
    profession?: string;
    country?: string;
}
/**
 * Current billing/quota state for the authenticated account.
 *
 * Returned by `ModelHealthClient.usage()`.
 */
export interface UsageInfo {
    recordingAllowed: boolean;
    /** Why recording is blocked. `undefined` when `recordingAllowed` is `true`. */
    reason?: UsageReason;
    /** Activities used in the current period. `undefined` when there is no active plan. */
    activitiesUsed?: number;
    /** Activities allowed in the current period. `undefined` when there is no active
     * plan. `undefined` while a plan IS active means unlimited. */
    activitiesMax?: number;
    /** When the current usage period ends. `undefined` when there is no active plan. */
    periodEnd?: Date;
    /** Name of the active plan. `undefined` when there is no active plan. */
    planName?: string;
    /** Whether the account is on a free trial. `undefined` only when there is no org,
     * or no plan and no prior plan history. */
    isFreeTrial?: boolean;
    /** How often the usage period resets. `undefined` when there is no active plan. */
    resetPeriod?: ResetPeriod;
    /** Whether the plan will automatically renew. `undefined` when there is no active
     * plan or no subscription is linked. */
    willAutoRenew?: boolean;
}
/**
 * How verbose a log event stream should be.
 *
 * Each level includes every level above it: `"warn"` includes `"error"`, `"info"`
 * includes both.
 *
 * @group Enumerations
 */
export type LogLevel = "off" | "error" | "warn" | "info";
/**
 * Which part of a session's lifecycle a log event describes.
 *
 * @group Enumerations
 */
export type LogCategory = "account" | "activity" | "analysis" | "metrics" | "sdk" | "session" | "subject" | "video";
/**
 * A single log event delivered to a handler registered via
 * `ModelHealthClient.setLogHandler`.
 */
export interface LogEvent {
    level: LogLevel;
    category: LogCategory;
    code: string;
    message: string;
    timestampMs: number;
}
//# sourceMappingURL=types.d.ts.map