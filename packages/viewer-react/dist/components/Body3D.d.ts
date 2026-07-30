import { type RefObject } from 'react';
import type { VisualizerTransforms } from '../types.js';
interface Body3DProps {
    transforms: VisualizerTransforms;
    currentTimeRef: RefObject<number>;
    color?: string;
    baseX: number;
    baseZ: number;
    endTime: number;
    onLoadingChange?: (isLoading: boolean) => void;
    /** Base URL bone mesh `.obj` assets are fetched from. Defaults to the public Model Health geometry bucket. */
    geometryBaseUrl?: string;
    /** Geometry filenames (source `.vtp` names) to skip fetching/rendering, e.g. non-visual collision meshes. */
    skipGeometries?: string[];
}
export declare function Body3D({ transforms, currentTimeRef, color, baseX, baseZ, endTime, onLoadingChange, geometryBaseUrl, skipGeometries, }: Body3DProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=Body3D.d.ts.map