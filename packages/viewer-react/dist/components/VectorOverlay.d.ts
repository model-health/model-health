import { type RefObject } from 'react';
import type { OverlayTransforms } from '../types.js';
interface VectorOverlayProps {
    transforms: OverlayTransforms;
    currentTimeRef: RefObject<number>;
    endTime: number;
    baseX: number;
    baseZ: number;
    leftColor: string;
    rightColor: string;
}
/**
 * Renders a left/right vector overlay for a trial.
 *
 * The SDK does not currently expose a motion data type for this — see
 * `../types.js`'s `OverlayTransforms` doc comment. Pass your own
 * `OverlayTransforms`, built via `fetchExternalSto` + `parseExternalSto` in
 * `../adapters.js`.
 */
export declare function VectorOverlay({ transforms, currentTimeRef, endTime, baseX, baseZ, leftColor, rightColor, }: VectorOverlayProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=VectorOverlay.d.ts.map