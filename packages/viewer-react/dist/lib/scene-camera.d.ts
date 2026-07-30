import { Vector3 } from 'three';
import type { MarkerTransforms, VisualizerTransforms } from '../types.js';
interface SceneEntry {
    transforms: VisualizerTransforms;
    baseX: number;
    baseZ: number;
    startFrameIndex: number;
    endFrameIndex: number;
}
interface MarkerBoundsEntry {
    transforms: MarkerTransforms;
    baseX: number;
    baseZ: number;
}
export interface SceneBounds {
    min: Vector3;
    max: Vector3;
}
export interface InitialCamera {
    position: Vector3;
    target: Vector3;
}
/** Compute the 3D bounding box of all body positions across every frame. */
export declare function computeSceneBounds(entries: SceneEntry[], markerEntries?: MarkerBoundsEntry[]): SceneBounds | null;
/** Derive camera position and orbit target from a movement bounding box. */
export declare function fitCameraToScene(bounds: SceneBounds, fovDeg: number, paddingFactor?: number): InitialCamera;
/**
 * Return the tracked body's centroid at the first frame for scene alignment.
 *
 * Defaults to `"pelvis"`, falling back to the first available body, but the
 * tracked body key is configurable since not every 3D view is guaranteed to
 * include a body named `"pelvis"`.
 */
export declare function computeBaseOffset(transforms: VisualizerTransforms, trackedBodyKey?: string): {
    baseX: number;
    baseZ: number;
};
export {};
//# sourceMappingURL=scene-camera.d.ts.map