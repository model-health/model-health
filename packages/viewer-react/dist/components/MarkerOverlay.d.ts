import { type RefObject } from 'react';
import type { MarkerTransforms } from '../types.js';
interface MarkerOverlayProps {
    transforms: MarkerTransforms;
    currentTimeRef: RefObject<number>;
    endTime: number;
    color?: string;
    baseX: number;
    baseZ: number;
}
export declare function MarkerOverlay({ transforms, currentTimeRef, endTime, color, baseX, baseZ, }: MarkerOverlayProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=MarkerOverlay.d.ts.map