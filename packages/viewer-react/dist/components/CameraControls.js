import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
export function CameraControls({ controlsRef, initialCamera }) {
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!initialCamera || !controlsRef.current || initializedRef.current)
            return;
        controlsRef.current.target.copy(initialCamera.target);
        controlsRef.current.update();
        initializedRef.current = true;
    }, [controlsRef, initialCamera]);
    return (_jsx(OrbitControls, { ref: controlsRef, makeDefault: true, enableDamping: true, dampingFactor: 0.08, minDistance: 0.5, maxDistance: 50 }));
}
//# sourceMappingURL=CameraControls.js.map