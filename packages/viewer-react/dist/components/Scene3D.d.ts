import type { OverlaySceneData, MarkerSceneData, VisualizerTransforms } from '../types.js';
import type { RefObject } from 'react';
interface Scene3DProps {
    transforms: VisualizerTransforms;
    color: string;
    markers: MarkerSceneData[];
    overlay?: OverlaySceneData;
    currentTimeRef: RefObject<number>;
    duration: number;
    /** Base URL bone mesh `.obj` assets are fetched from. Defaults to the public Model Health geometry bucket. */
    geometryBaseUrl?: string;
    /** Geometry filenames (source `.vtp` names) to skip fetching/rendering. */
    skipGeometries?: string[];
    /** Body segment used to anchor the scene origin and initial camera fit. Defaults to `"pelvis"`. */
    trackedBodyKey?: string;
}
export declare function Scene3D({ transforms, color, markers, overlay, currentTimeRef, duration, geometryBaseUrl, skipGeometries, trackedBodyKey, }: Scene3DProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Scene3D.d.ts.map