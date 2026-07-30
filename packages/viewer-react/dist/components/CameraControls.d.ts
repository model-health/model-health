import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { InitialCamera } from '../lib/scene-camera.js';
interface CameraControlsProps {
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    initialCamera?: InitialCamera;
}
export declare function CameraControls({ controlsRef, initialCamera }: CameraControlsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=CameraControls.d.ts.map