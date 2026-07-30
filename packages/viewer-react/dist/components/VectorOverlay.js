import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { OVERLAY_ARROW_MAX_LENGTH_M, OVERLAY_ARROW_M_PER_KN, OVERLAY_ARROW_MIN_MAGNITUDE_N, } from '../config.js';
function getFrameIndex(currentTime, endTime, frameCount) {
    if (endTime <= 0 || frameCount <= 1) {
        return 0;
    }
    const progress = Math.min(Math.max(currentTime / endTime, 0), 1);
    return Math.round(progress * (frameCount - 1));
}
function arrowLengthMagnitude(force) {
    const magnitudeN = Math.hypot(force[0], force[1], force[2]);
    if (magnitudeN < OVERLAY_ARROW_MIN_MAGNITUDE_N) {
        return 0;
    }
    return Math.min(OVERLAY_ARROW_MAX_LENGTH_M, (magnitudeN / 1000) * OVERLAY_ARROW_M_PER_KN);
}
function OverlayArrow({ footData, frameIndexRef, color, baseX, baseZ, }) {
    const groupRef = useRef(null);
    const shaftRef = useRef(null);
    const headRef = useRef(null);
    const up = useRef(new Vector3(0, 1, 0));
    const direction = useRef(new Vector3());
    useFrame(() => {
        if (!groupRef.current || !shaftRef.current || !headRef.current)
            return;
        const frameIndex = frameIndexRef.current ?? 0;
        const rawOrigin = footData.origin[frameIndex];
        const rawForce = footData.vector[frameIndex];
        if (!rawOrigin || !rawForce)
            return;
        const arrowLength = arrowLengthMagnitude(rawForce);
        if (arrowLength <= 0) {
            groupRef.current.visible = false;
            return;
        }
        groupRef.current.visible = true;
        groupRef.current.position.set(rawOrigin[0] - baseX, rawOrigin[1], rawOrigin[2] - baseZ);
        direction.current.set(rawForce[0], rawForce[1], rawForce[2]).normalize();
        groupRef.current.quaternion.setFromUnitVectors(up.current, direction.current);
        const shaftLength = Math.max(arrowLength - 0.04, 0.01);
        shaftRef.current.scale.set(1, shaftLength, 1);
        shaftRef.current.position.set(0, shaftLength * 0.5, 0);
        headRef.current.position.set(0, arrowLength, 0);
    });
    return (_jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { ref: shaftRef, children: [_jsx("cylinderGeometry", { args: [0.008, 0.028, 1, 8] }), _jsx("meshPhongMaterial", { color: color })] }), _jsxs("mesh", { ref: headRef, children: [_jsx("coneGeometry", { args: [0.038, 0.04, 8] }), _jsx("meshPhongMaterial", { color: color })] })] }));
}
/**
 * Renders a left/right vector overlay for a trial.
 *
 * The SDK does not currently expose a motion data type for this — see
 * `../types.js`'s `OverlayTransforms` doc comment. Pass your own
 * `OverlayTransforms`, built via `fetchExternalSto` + `parseExternalSto` in
 * `../adapters.js`.
 */
export function VectorOverlay({ transforms, currentTimeRef, endTime, baseX, baseZ, leftColor, rightColor, }) {
    const frameIndexRef = useRef(0);
    const frameCount = transforms.time.length;
    useFrame(() => {
        frameIndexRef.current = getFrameIndex(currentTimeRef.current ?? 0, endTime, frameCount);
    });
    return (_jsxs("group", { children: [_jsx(OverlayArrow, { footData: transforms.sides.left, frameIndexRef: frameIndexRef, color: leftColor, baseX: baseX, baseZ: baseZ }), _jsx(OverlayArrow, { footData: transforms.sides.right, frameIndexRef: frameIndexRef, color: rightColor, baseX: baseX, baseZ: baseZ })] }));
}
//# sourceMappingURL=VectorOverlay.js.map