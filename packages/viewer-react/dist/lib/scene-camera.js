import { Vector3 } from 'three';
/** Compute the 3D bounding box of all body positions across every frame. */
export function computeSceneBounds(entries, markerEntries = []) {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const entry of entries) {
        for (const body of Object.values(entry.transforms.bodies)) {
            const start = Math.max(0, entry.startFrameIndex);
            const end = Math.min(body.translation.length, entry.endFrameIndex + 1);
            for (let f = start; f < end; f++) {
                const t = body.translation[f];
                if (!t)
                    continue;
                const wx = t[0] - entry.baseX;
                const wy = t[1];
                const wz = t[2] - entry.baseZ;
                min.x = Math.min(min.x, wx);
                max.x = Math.max(max.x, wx);
                min.y = Math.min(min.y, wy);
                max.y = Math.max(max.y, wy);
                min.z = Math.min(min.z, wz);
                max.z = Math.max(max.z, wz);
            }
        }
    }
    for (const markerEntry of markerEntries) {
        for (const positions of Object.values(markerEntry.transforms.markers)) {
            for (const position of positions) {
                const wx = position[0] - markerEntry.baseX;
                const wy = position[1];
                const wz = position[2] - markerEntry.baseZ;
                min.x = Math.min(min.x, wx);
                max.x = Math.max(max.x, wx);
                min.y = Math.min(min.y, wy);
                max.y = Math.max(max.y, wy);
                min.z = Math.min(min.z, wz);
                max.z = Math.max(max.z, wz);
            }
        }
    }
    if (!isFinite(min.x))
        return null;
    return { min, max };
}
/** Derive camera position and orbit target from a movement bounding box. */
export function fitCameraToScene(bounds, fovDeg, paddingFactor = 3.0) {
    const center = new Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
    const size = new Vector3().subVectors(bounds.max, bounds.min);
    const maxDim = Math.max(size.y, size.z, size.x * 0.25, 0.1);
    const fovRad = (fovDeg * Math.PI) / 180;
    const distance = (maxDim / 2 / Math.tan(fovRad / 2)) * paddingFactor;
    const direction = new Vector3(4.5, 1.5, -3).normalize();
    return {
        target: center.clone(),
        position: center.clone().add(direction.multiplyScalar(distance)),
    };
}
/**
 * Return the tracked body's centroid at the first frame for scene alignment.
 *
 * Defaults to `"pelvis"`, falling back to the first available body, but the
 * tracked body key is configurable since not every 3D view is guaranteed to
 * include a body named `"pelvis"`.
 */
export function computeBaseOffset(transforms, trackedBodyKey = 'pelvis') {
    const tracked = transforms.bodies[trackedBodyKey] ?? Object.values(transforms.bodies)[0];
    if (!tracked?.translation.length) {
        return { baseX: 0, baseZ: 0 };
    }
    const first = tracked.translation[0];
    return { baseX: first[0], baseZ: first[2] };
}
//# sourceMappingURL=scene-camera.js.map