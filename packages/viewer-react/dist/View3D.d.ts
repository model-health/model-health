import type { OverlayTransforms, MarkerTransforms, VisualizerTransforms } from './types.js';
export interface View3DMarkerLayer {
    id: string;
    label: string;
    transforms: MarkerTransforms;
    color?: string;
}
export interface View3DProps {
    /** Parsed animation data — see `fetchAnimationTransforms` in `./adapters.js`. */
    transforms: VisualizerTransforms;
    /** Optional marker overlay layers — see `fetchMarkerTransforms` in `./adapters.js`. */
    markers?: View3DMarkerLayer[];
    /**
     * Optional left/right vector overlay. Not currently backed by an SDK motion
     * data type — see `fetchExternalSto` + `parseExternalSto` in `./adapters.js`,
     * which fetch and parse the synced `.sto` result of external data you uploaded
     * under a tag of your choosing.
     */
    overlay?: OverlayTransforms;
    /** Body mesh tint color. Defaults to white. */
    color?: string;
    /** Base URL bone mesh `.obj` assets are fetched from. Defaults to the public Model Health geometry bucket. */
    geometryBaseUrl?: string;
    /** Geometry filenames (source `.vtp` names) to skip fetching/rendering. */
    skipGeometries?: string[];
    /** Body segment used to anchor the scene origin and initial camera fit. Defaults to `"pelvis"`. */
    trackedBodyKey?: string;
    /** Additional class name applied to the root element. */
    className?: string;
    /**
     * Called whenever playback starts or stops, including when it stops on its
     * own (e.g. reaching the end) — not just in response to `play()`/`pause()`.
     * Use this to keep an external play/pause toggle in sync with actual state.
     */
    onPlayingChange?: (isPlaying: boolean) => void;
    /**
     * Called whenever the computed duration changes (typically once, right
     * after `transforms`/`markers`/`overlay` are set) — use this to size a
     * scrubber's range without needing a render to read `ref.current.duration`.
     */
    onDurationChange?: (duration: number) => void;
}
/**
 * Imperative playback control, obtained via `ref`.
 *
 * `View3D` renders no built-in play/pause/step/speed/scrubber UI — build your
 * own controls against this handle (optionally reusing the exported
 * `PlaybackControls` component) so you can style them to match your app.
 */
export interface View3DHandle {
    play(): void;
    pause(): void;
    seek(time: number): void;
    /** Steps one frame forward (`1`) or backward (`-1`). */
    step(direction: number): void;
    setPlaybackSpeed(speed: number): void;
    readonly currentTime: number;
    readonly duration: number;
    readonly isPlaying: boolean;
    readonly playbackSpeed: number;
}
/**
 * An embeddable 3D replay view for a processed Model Health activity.
 *
 * ```tsx
 * const transforms = await fetchAnimationTransforms(client, activity);
 * <View3D transforms={transforms} />
 * ```
 *
 * Use the `ref` to control playback imperatively:
 * ```tsx
 * const viewerRef = useRef<View3DHandle>(null);
 * viewerRef.current?.play();
 * ```
 */
export declare const View3D: import("react").ForwardRefExoticComponent<View3DProps & import("react").RefAttributes<View3DHandle>>;
//# sourceMappingURL=View3D.d.ts.map