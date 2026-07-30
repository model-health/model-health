import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Scene3D } from './components/Scene3D.js';
import { computeBaseOffset } from './lib/scene-camera.js';
import { OVERLAY_LEFT_COLOR, OVERLAY_RIGHT_COLOR, MARKERS_POST_COLOR, DEFAULT_BODY_COLOR, } from './config.js';
function computeDuration(...timeSeries) {
    const ends = timeSeries
        .filter((series) => Boolean(series))
        .map((series) => series.time.at(-1) ?? 0)
        .filter((value) => value > 0);
    return ends.length ? Math.max(...ends) : 0;
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
export const View3D = forwardRef(function View3D({ transforms, markers = [], overlay, color = DEFAULT_BODY_COLOR, geometryBaseUrl, skipGeometries, trackedBodyKey, className, onPlayingChange, onDurationChange, }, ref) {
    // currentTime is intentionally NOT React state: nothing in this component's
    // own render output depends on it (Scene3D/Body3D read the ref directly, per
    // frame, outside React's render cycle) now that there's no built-in scrubber
    // to feed. External consumers that need a live readout (e.g. their own
    // scrubber UI) poll `ref.current.currentTime` on their own schedule. Making
    // this reactive state would force a full re-render on every animation frame
    // for no visual benefit.
    const currentTimeRef = useRef(0);
    const [playing, setPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeedState] = useState(1);
    const duration = useMemo(() => computeDuration(transforms, ...markers.map((layer) => layer.transforms), overlay), [transforms, markers, overlay]);
    useEffect(() => {
        onDurationChange?.(duration);
    }, [duration, onDurationChange]);
    // Fires on every transition regardless of cause (imperative play()/pause(),
    // or playback stopping itself at the end) — a single source of truth for
    // callers that need to mirror this state.
    useEffect(() => {
        onPlayingChange?.(playing);
    }, [playing, onPlayingChange]);
    useEffect(() => {
        if (!playing || duration <= 0)
            return;
        // Playback stops at the end with currentTime frozen at duration. Without
        // this, resuming would immediately recompute next >= duration on the very
        // first tick and stop again instantly — restart from the beginning instead,
        // matching standard video-player behavior.
        if (currentTimeRef.current >= duration) {
            currentTimeRef.current = 0;
        }
        let frameId = 0;
        let lastTimestamp = performance.now();
        const tick = (timestamp) => {
            const deltaSeconds = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            const next = currentTimeRef.current + deltaSeconds * playbackSpeed;
            if (next >= duration) {
                currentTimeRef.current = duration;
                setPlaying(false);
            }
            else {
                currentTimeRef.current = next;
                frameId = requestAnimationFrame(tick);
            }
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [playing, duration, playbackSpeed]);
    useImperativeHandle(ref, () => ({
        play: () => setPlaying(true),
        pause: () => setPlaying(false),
        seek: (time) => {
            currentTimeRef.current = Math.min(Math.max(time, 0), duration);
        },
        step: (direction) => {
            if (duration <= 0)
                return;
            const frameDuration = duration / Math.max(transforms.time.length - 1, 1);
            currentTimeRef.current = Math.min(Math.max(currentTimeRef.current + direction * frameDuration, 0), duration);
        },
        setPlaybackSpeed: (speed) => setPlaybackSpeedState(speed),
        get currentTime() {
            return currentTimeRef.current;
        },
        get duration() {
            return duration;
        },
        get isPlaying() {
            return playing;
        },
        get playbackSpeed() {
            return playbackSpeed;
        },
    }), [duration, playing, playbackSpeed, transforms]);
    const markerLayers = useMemo(() => {
        const { baseX, baseZ } = computeBaseOffset(transforms, trackedBodyKey);
        return markers.map((layer) => ({
            id: layer.id,
            label: layer.label,
            transforms: layer.transforms,
            baseX,
            baseZ,
            color: layer.color ?? MARKERS_POST_COLOR,
        }));
    }, [markers, transforms, trackedBodyKey]);
    const overlaySceneData = useMemo(() => {
        if (!overlay)
            return undefined;
        const { baseX, baseZ } = computeBaseOffset(transforms, trackedBodyKey);
        return {
            transforms: overlay,
            baseX,
            baseZ,
            leftColor: OVERLAY_LEFT_COLOR,
            rightColor: OVERLAY_RIGHT_COLOR,
        };
    }, [overlay, transforms, trackedBodyKey]);
    return (_jsx("div", { className: ['mh-view-3d', className].filter(Boolean).join(' '), children: _jsx(Scene3D, { transforms: transforms, color: color, markers: markerLayers, overlay: overlaySceneData, currentTimeRef: currentTimeRef, duration: duration, geometryBaseUrl: geometryBaseUrl, skipGeometries: skipGeometries, trackedBodyKey: trackedBodyKey }) }));
});
//# sourceMappingURL=View3D.js.map