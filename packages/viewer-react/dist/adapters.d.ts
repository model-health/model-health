import type { Activity, ModelHealthClient } from '@modelhealth/modelhealth';
import type { OverlayTransforms, MarkerTransforms, VisualizerTransforms } from './types.js';
/**
 * Parses the wide-format marker CSV produced by the SDK's `markers_csv` motion
 * data type (`frame,time,MARKER1_X,MARKER1_Y,MARKER1_Z,MARKER2_X,...`) into the
 * `MarkerTransforms` shape `MarkerOverlay` expects.
 *
 * There is no dedicated "marker positions as JSON" motion data type in the SDK
 * today (unlike `VisualizerTransforms`, which is a purpose-built JSON payload) —
 * this parses the general-purpose CSV export instead.
 */
export declare function parseMarkersCsv(csv: string): MarkerTransforms;
/**
 * Parses an OpenSim `ExternalLoads` `.sto` file into the
 * `OverlayTransforms` shape `VectorOverlay` expects.
 *
 * Expects the fixed column layout: `time`, `leftFoot_v{x,y,z}`,
 * `leftFoot_p{x,y,z}`, `rightFoot_v{x,y,z}`, `rightFoot_p{x,y,z}` (torque
 * columns, `*_T{x,y,z}`, are present in the file but ignored — they aren't
 * part of `OverlayFootData`).
 */
export declare function parseExternalSto(sto: string): OverlayTransforms;
/**
 * Downloads and parses an activity's 3D animation data.
 *
 * ```typescript
 * const transforms = await fetchAnimationTransforms(client, activity);
 * ```
 *
 * @throws If the activity has no `animation` result available.
 */
export declare function fetchAnimationTransforms(client: ModelHealthClient, activity: Activity): Promise<VisualizerTransforms>;
/**
 * Downloads and parses an activity's augmented marker positions.
 *
 * Returns `null` if no marker data is available, rather than throwing —
 * marker data is a supplementary overlay, not required for 3D playback.
 */
export declare function fetchMarkerTransforms(client: ModelHealthClient, activity: Activity): Promise<MarkerTransforms | null>;
/**
 * Downloads the raw text of a `.sto` file tagged `` `${filename}-sync` `` for
 * an activity — `filename` is the tag you originally uploaded the file under;
 * the synced result is stored separately, which is what this fetches.
 *
 * Returns `null` rather than throwing if it doesn't exist (or any other fetch
 * failure) — pair it with a specific parser, e.g. `parseExternalSto`.
 */
export declare function fetchExternalSto(client: ModelHealthClient, activity: Activity, filename: string): Promise<string | null>;
//# sourceMappingURL=adapters.d.ts.map