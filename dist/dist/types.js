/**
 * Model Health SDK TypeScript Types
 *
 * Complete type definitions for the Model Health biomechanics SDK.
 *
 * @packageDocumentation
 */
// MARK: - Analysis
/**
 * Represents available analysis functions for motion capture data.
 *
 * Each analysis type processes activity data to extract specific biomechanical metrics
 * and insights. Analysis can only be performed on activities that have completed processing.
 */
export const AnalysisType = {
    /** Counter Movement Jump */
    CounterMovementJump: "counter_movement_jump",
    /** Overground Walking */
    Gait: "gait",
    /** Treadmill Running */
    TreadmillRunning: "treadmill_running",
    /** Sit-to-Stand Transfer */
    SitToStand: "sit_to_stand",
    /** Squat Exercise */
    Squats: "squats",
    /** Range of Motion (ROM) */
    RangeOfMotion: "range_of_motion",
    /** Overground Running */
    OvergroundRunning: "overground_running",
    /** Drop Vertical Jump */
    DropJump: "drop_jump",
    /** Hop Test */
    Hop: "hop",
    /** Treadmill Walking */
    TreadmillGait: "treadmill_gait",
    /** 5-0-5 Test */
    ChangeOfDirection: "change_of_direction",
    /** Cutting Maneuver */
    Cut: "cut",
};
//# sourceMappingURL=types.js.map