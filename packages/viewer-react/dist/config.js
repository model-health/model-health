export const DEFAULT_BODY_COLOR = '#FFFFFF';
export const MARKERS_POST_COLOR = '#22C55E';
export const MARKERS_STUDY_COLOR = '#22D3EE';
export const OVERLAY_LEFT_COLOR = '#d1ff52';
export const OVERLAY_RIGHT_COLOR = '#0066FF';
export const MARKER_SPHERE_RADIUS = 0.012;
/**
 * Default public bucket hosting `.vtp`-derived `.obj` bone mesh geometry.
 *
 * This is a documented default, not a hardcoded requirement — pass
 * `geometryBaseUrl`/`skipGeometries` to `View3D` (or directly to
 * `Body3D`) to point at a different asset host.
 */
export const DEFAULT_MODEL_GEOMETRY_BASE_URL = 'https://mc-modelhealth-public.s3.us-west-2.amazonaws.com/geometries';
export const DEFAULT_MODEL_SKIP_GEOMETRIES = ['block.vtp'];
/** Body segment used to anchor the scene origin and initial camera fit by default. */
export const DEFAULT_TRACKED_BODY_KEY = 'pelvis';
export const CAMERA_FOV = 45;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 125;
export const GROUND_GRID_SIZE = 60;
export const GROUND_GRID_DIVISIONS = 48;
export const GROUND_GRID_COLOR = '#c8cbcd';
export const GROUND_FLOOR_COLOR = '#000000';
export const GROUND_GRID_LINE_THICKNESS = 0.25;
export const GROUND_GRID_OPACITY = 0.9;
export const GROUND_GRID_FADE_INNER = 0.92;
export const GROUND_GRID_FADE_OUTER = 2.08;
export const OVERLAY_ARROW_MAX_LENGTH_M = 6;
export const OVERLAY_ARROW_M_PER_KN = 1.8;
export const OVERLAY_ARROW_MIN_MAGNITUDE_N = 40;
export const PLAYBACK_SPEED_OPTIONS = [0.25, 0.5, 1];
//# sourceMappingURL=config.js.map