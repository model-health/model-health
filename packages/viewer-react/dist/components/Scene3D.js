import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Color, NoToneMapping } from 'three';
import { SceneLighting } from './SceneLighting.js';
import { GroundPlane } from './GroundPlane.js';
import { CameraControls } from './CameraControls.js';
import { Body3D } from './Body3D.js';
import { MarkerOverlay } from './MarkerOverlay.js';
import { VectorOverlay } from './VectorOverlay.js';
import { CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, DEFAULT_TRACKED_BODY_KEY } from '../config.js';
import { computeSceneBounds, fitCameraToScene, computeBaseOffset } from '../lib/scene-camera.js';
const CAMERA_POSITION = [4.5, 3, -3];
const SCENE_BACKGROUND_COLOR = '#000000';
function SceneContent({ transforms, color, markers, overlay, currentTimeRef, duration, onAssetsLoadingChange, initialCamera, geometryBaseUrl, skipGeometries, trackedBodyKey, }) {
    const controlsRef = useRef(null);
    const loadingCountRef = useRef(0);
    const { baseX, baseZ } = computeBaseOffset(transforms, trackedBodyKey);
    const handleLoadingChange = useCallback((isLoading) => {
        loadingCountRef.current = isLoading
            ? loadingCountRef.current + 1
            : Math.max(0, loadingCountRef.current - 1);
        onAssetsLoadingChange(loadingCountRef.current > 0);
    }, [onAssetsLoadingChange]);
    return (_jsxs(_Fragment, { children: [_jsx(SceneLighting, {}), _jsx(GroundPlane, {}), _jsx(CameraControls, { controlsRef: controlsRef, initialCamera: initialCamera }), _jsx(Body3D, { transforms: transforms, currentTimeRef: currentTimeRef, color: color, baseX: baseX, baseZ: baseZ, endTime: duration, onLoadingChange: handleLoadingChange, geometryBaseUrl: geometryBaseUrl, skipGeometries: skipGeometries }), markers.map((markerLayer) => (_jsx(MarkerOverlay, { transforms: markerLayer.transforms, currentTimeRef: currentTimeRef, endTime: duration, color: markerLayer.color, baseX: markerLayer.baseX, baseZ: markerLayer.baseZ }, markerLayer.id))), overlay && (_jsx(VectorOverlay, { transforms: overlay.transforms, currentTimeRef: currentTimeRef, endTime: duration, baseX: overlay.baseX, baseZ: overlay.baseZ, leftColor: overlay.leftColor, rightColor: overlay.rightColor }))] }));
}
export function Scene3D({ transforms, color, markers, overlay, currentTimeRef, duration, geometryBaseUrl, skipGeometries, trackedBodyKey = DEFAULT_TRACKED_BODY_KEY, }) {
    const [isAssetsLoading, setIsAssetsLoading] = useState(true);
    const { baseX, baseZ } = useMemo(() => computeBaseOffset(transforms, trackedBodyKey), [transforms, trackedBodyKey]);
    const sceneEntries = useMemo(() => [{
            transforms,
            baseX,
            baseZ,
            startFrameIndex: 0,
            endFrameIndex: transforms.time.length - 1,
        }], [transforms, baseX, baseZ]);
    const markerBounds = useMemo(() => markers.map((markerLayer) => ({
        transforms: markerLayer.transforms,
        baseX: markerLayer.baseX,
        baseZ: markerLayer.baseZ,
    })), [markers]);
    const bounds = useMemo(() => computeSceneBounds(sceneEntries, markerBounds), [sceneEntries, markerBounds]);
    const initialCamera = useMemo(() => (bounds ? fitCameraToScene(bounds, CAMERA_FOV) : null), [bounds]);
    return (_jsxs("div", { className: "mh-scene-container", children: [_jsx(Suspense, { fallback: _jsx("div", { className: "mh-scene-loading", children: "Loading scene\u2026" }), children: _jsx(Canvas, { onCreated: ({ gl, scene }) => {
                        gl.toneMapping = NoToneMapping;
                        scene.fog = null;
                        scene.background = new Color(SCENE_BACKGROUND_COLOR);
                    }, camera: {
                        fov: CAMERA_FOV,
                        near: CAMERA_NEAR,
                        far: CAMERA_FAR,
                        position: initialCamera
                            ? [initialCamera.position.x, initialCamera.position.y, initialCamera.position.z]
                            : CAMERA_POSITION,
                    }, gl: { antialias: true }, children: _jsx(SceneContent, { transforms: transforms, color: color, markers: markers, overlay: overlay, currentTimeRef: currentTimeRef, duration: duration, onAssetsLoadingChange: setIsAssetsLoading, initialCamera: initialCamera ?? undefined, geometryBaseUrl: geometryBaseUrl, skipGeometries: skipGeometries, trackedBodyKey: trackedBodyKey }) }) }), isAssetsLoading && _jsx("div", { className: "mh-scene-loading mh-overlay", children: "Loading meshes\u2026" })] }));
}
//# sourceMappingURL=Scene3D.js.map