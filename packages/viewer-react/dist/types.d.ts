/**
 * Per-frame 3D transform data for a single body segment (e.g. `"pelvis"`, `"femur_r"`).
 *
 * `rotation` and `translation` each have one entry per frame, in the same
 * order as {@link VisualizerTransforms.time}.
 */
export interface BodyTransform {
    /** Mesh asset filenames (e.g. `"pelvis.vtp"`) attached to this body segment. */
    attachedGeometries: string[];
    /** Per-axis `[x, y, z]` scale factor applied to the attached geometry. */
    scaleFactors: [number, number, number];
    /** Euler rotation `[x, y, z]` in radians (intrinsic XYZ order), one entry per frame. */
    rotation: [number, number, number][];
    /** Translation `[x, y, z]` in meters, one entry per frame. */
    translation: [number, number, number][];
}
/**
 * Parsed per-body-segment 3D transforms for a trial's animation, produced by
 * the SDK's `"animation"` motion data type.
 *
 * @example
 * ```typescript
 * const transforms = await fetchAnimationTransforms(client, activity);
 * ```
 */
export interface VisualizerTransforms {
    /** Frame timestamps in seconds. */
    time: number[];
    /** Body segment transforms, keyed by body name (e.g. `"pelvis"`, `"femur_r"`). */
    bodies: Record<string, BodyTransform>;
}
/**
 * Augmented marker trajectories for a trial, keyed by marker name.
 *
 * Like `VisualizerTransforms`, this shape isn't exposed by the SDK itself —
 * see `parseMarkersCsv` in `./adapters.js` for how to build one from
 * the SDK's existing `markers_csv` motion data type.
 */
export interface MarkerTransforms {
    time: number[];
    markers: Record<string, [number, number, number][]>;
}
/** Per-frame vector and application point for one side (e.g. a foot) of an overlay. */
export interface OverlayFootData {
    origin: [number, number, number][];
    vector: [number, number, number][];
}
/**
 * Generic left/right vector-overlay data for a trial
 * — one vector + application point per frame, per side.
 *
 * The SDK does not currently expose a motion data type for this — build one via
 * `fetchExternalSto` + `parseExternalSto` in `./adapters.js`, which fetch and parse
 * the synced `.sto` result of external data you uploaded (in whatever format —
 * CSV, JSON, etc. — under a tag of your choosing).
 */
export interface OverlayTransforms {
    time: number[];
    sides: {
        left: OverlayFootData;
        right: OverlayFootData;
    };
}
/** One rendered body/marker layer's data plus its scene-space offset and color. */
export interface MarkerSceneData {
    id: string;
    label: string;
    transforms: MarkerTransforms;
    baseX: number;
    baseZ: number;
    color: string;
}
/** One rendered vector-overlay layer's data plus its scene-space offset and colors. */
export interface OverlaySceneData {
    transforms: OverlayTransforms;
    baseX: number;
    baseZ: number;
    leftColor: string;
    rightColor: string;
}
//# sourceMappingURL=types.d.ts.map