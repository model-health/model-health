import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MARKER_SPHERE_RADIUS, MARKERS_POST_COLOR, MARKERS_STUDY_COLOR } from '../config.js';
function markerColor(markerName, defaultColor) {
    return markerName.endsWith('_study') ? MARKERS_STUDY_COLOR : defaultColor;
}
function getFrameIndex(currentTime, endTime, frameCount) {
    if (endTime <= 0 || frameCount <= 1) {
        return 0;
    }
    const progress = Math.min(Math.max(currentTime / endTime, 0), 1);
    return Math.round(progress * (frameCount - 1));
}
function MarkerSphere({ positions, frameIndexRef, color, baseX, baseZ, }) {
    const meshRef = useRef(null);
    useFrame(() => {
        if (!meshRef.current)
            return;
        const frameIndex = frameIndexRef.current ?? 0;
        const position = positions[frameIndex];
        if (!position)
            return;
        meshRef.current.position.set(position[0] - baseX, position[1], position[2] - baseZ);
    });
    return (_jsxs("mesh", { ref: meshRef, children: [_jsx("sphereGeometry", { args: [MARKER_SPHERE_RADIUS, 12, 12] }), _jsx("meshPhongMaterial", { color: color })] }));
}
export function MarkerOverlay({ transforms, currentTimeRef, endTime, color = MARKERS_POST_COLOR, baseX, baseZ, }) {
    const frameIndexRef = useRef(0);
    const frameCount = transforms.time.length;
    useFrame(() => {
        frameIndexRef.current = getFrameIndex(currentTimeRef.current ?? 0, endTime, frameCount);
    });
    return (_jsx("group", { children: Object.entries(transforms.markers).map(([markerName, positions]) => (_jsx(MarkerSphere, { positions: positions, frameIndexRef: frameIndexRef, color: markerColor(markerName, color), baseX: baseX, baseZ: baseZ }, markerName))) }));
}
//# sourceMappingURL=MarkerOverlay.js.map