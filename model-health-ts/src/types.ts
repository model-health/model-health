/**
 * ModelHealth SDK TypeScript Types
 * 
 * Complete type definitions for the ModelHealth biomechanics SDK.
 * 
 * @packageDocumentation
 */

// MARK: - Authentication

/**
 * Result of a login attempt.
 * 
 * - `ok`: Login successful, user is authenticated
 * - `verification_required`: Two-factor authentication required
 */
export type LoginResult = "ok" | "verification_required";

/**
 * Unit system preference for measurements.
 */
export type Unit = "metric" | "imperial";

/**
 * Parameters required for creating a new user account.
 */
export interface RegistrationParameters {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  country?: string;
  institution?: string;
  profession?: string;
  reason?: string;
  website?: string;
  language?: string;
  unit?: Unit;
  newsletter: boolean;
}

// MARK: - Session

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

// MARK: - Subject

/**
 * Gender identity options for subject demographics.
 */
export type Gender =
  | "woman"
  | "man"
  | "transgender"
  | "non_binary"
  | "no_response";

/**
 * Sex assigned at birth options for subject demographics.
 */
export type Sex =
  | "woman"
  | "man"
  | "intersex"
  | "not_listed"
  | "no_response";

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

// MARK: - Video

/**
 * Video file associated with an activity.
 */
export interface Video {
  id: string;
  activity: string;
  video?: string;
  video_thumb?: string;
}

// MARK: - Activity

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
export type ActivityProcessingStatus =
  | { type: "uploading"; uploaded: number; total: number }
  | { type: "processing" }
  | { type: "ready" }
  | { type: "failed" };

// MARK: - Video and Result Data

/**
 * Video version types available for download.
 */
export type VideoVersion = "raw" | "synced";

/**
 * Result data types available for download from activities.
 */
export type ResultDataType = "visualization" | "kinematic";

/**
 * File format types for downloaded result data.
 */
export type FileType = "json" | "csv";

/**
 * Downloaded result data from an activity.
 */
export interface ResultData {
  file_type: FileType;
  data: Uint8Array;
}

// MARK: - Checkerboard

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

// MARK: - Calibration

/**
 * Status updates during calibration process.
 */
export type CalibrationStatus =
  | { type: "recording" }
  | { type: "uploading"; uploaded: number; total: number }
  | { type: "processing"; percent?: number }
  | { type: "done" };

// MARK: - Analysis

/**
 * Analysis types supported by the ModelHealth platform.
 */
export type AnalysisType = "counter_movement_jump";

/**
 * Identifier for a running analysis task.
 */
export interface AnalysisTask {
  task_id: string;
}

/**
 * Status of an analysis task.
 */
export type AnalysisTaskStatus =
  | { type: "processing" }
  | { type: "completed"; result_tags: string[] }
  | { type: "failed" };

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
export type MetricValue =
  | { type: "single"; value: number }
  | { type: "bilateral"; left: number; right: number };

// MARK: - Storage Interface

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
export class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null;

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
  }

  async removeToken(): Promise<void> {
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
export class LocalStorageTokenStorage implements TokenStorage {
  private key: string;

  /**
   * Create a LocalStorage token storage.
   * 
   * @param key Storage key name (default: "modelhealth_token")
   */
  constructor(key = "modelhealth_token") {
    this.key = key;
  }

  async getToken(): Promise<string | null> {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage.getItem(this.key);
  }

  async setToken(token: string): Promise<void> {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage is not available");
    }
    localStorage.setItem(this.key, token);
  }

  async removeToken(): Promise<void> {
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
export function getJumpHeight(result: AnalysisResult): number | null {
  const metric = result.metrics["00_jump_height_COM"];
  return metric?.value.type === "single" ? metric.value.value : null;
}

/**
 * Extract jump time from CMJ analysis results.
 * 
 * @param result Analysis result from counter-movement jump
 * @returns Jump time in seconds, or null if not available
 */
export function getJumpTime(result: AnalysisResult): number | null {
  const metric = result.metrics["01_jump_time"];
  return metric?.value.type === "single" ? metric.value.value : null;
}

/**
 * Extract concentric/eccentric time ratio from CMJ analysis results.
 * 
 * @param result Analysis result from counter-movement jump
 * @returns Time ratio, or null if not available
 */
export function getConcentricEccentricTimeRatio(result: AnalysisResult): number | null {
  const metric = result.metrics["02_ratio_concentric_eccentric_time"];
  return metric?.value.type === "single" ? metric.value.value : null;
}

/**
 * Extract reactive strength index from CMJ analysis results.
 * 
 * @param result Analysis result from counter-movement jump
 * @returns Reactive strength index, or null if not available
 */
export function getReactiveStrengthIndex(result: AnalysisResult): number | null {
  const metric = result.metrics["03_reactive_strength_index_COM"];
  return metric?.value.type === "single" ? metric.value.value : null;
}

/**
 * Extract peak vertical velocity from CMJ analysis results.
 * 
 * @param result Analysis result from counter-movement jump
 * @returns Peak velocity in m/s, or null if not available
 */
export function getPeakVerticalVelocity(result: AnalysisResult): number | null {
  const metric = result.metrics["04_peak_vertical_COM_speed_during_takeoff"];
  return metric?.value.type === "single" ? metric.value.value : null;
}

/**
 * Extract peak knee extension speed during takeoff from CMJ analysis results.
 * 
 * @param result Analysis result from counter-movement jump
 * @returns Object with left and right values in deg/s, or null if not available
 */
export function getPeakKneeExtensionSpeed(result: AnalysisResult): { left: number; right: number } | null {
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
export function getPeakHipExtensionSpeed(result: AnalysisResult): { left: number; right: number } | null {
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
export function getPeakKneeFlexionLanding(result: AnalysisResult): { left: number; right: number } | null {
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
export function getPeakKneeValgusLanding(result: AnalysisResult): { left: number; right: number } | null {
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
export function getPeakHipFlexionLanding(result: AnalysisResult): { left: number; right: number } | null {
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
export function getPeakTrunkFlexionLanding(result: AnalysisResult): number | null {
  const metric = result.metrics["10_peak_trunk_flexion_relative_to_ground_during_landing"];
  return metric?.value.type === "single" ? metric.value.value : null;
}

/**
 * Extract peak trunk lean during landing from CMJ analysis results.
 * 
 * @param result Analysis result from counter-movement jump
 * @returns Trunk lean angle in degrees, or null if not available
 */
export function getPeakTrunkLeanLanding(result: AnalysisResult): number | null {
  const metric = result.metrics["11_peak_trunk_lean_relative_to_ground_during_landing"];
  return metric?.value.type === "single" ? metric.value.value : null;
}
