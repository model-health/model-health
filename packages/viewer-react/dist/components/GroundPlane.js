import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Color, DoubleSide } from 'three';
import { GROUND_GRID_SIZE, GROUND_GRID_DIVISIONS, GROUND_GRID_COLOR, GROUND_FLOOR_COLOR, GROUND_GRID_LINE_THICKNESS, GROUND_GRID_OPACITY, GROUND_GRID_FADE_INNER, GROUND_GRID_FADE_OUTER, } from '../config.js';
const GRID_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const GRID_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uDivisions;
uniform float uLineThickness;
uniform float uOpacity;
uniform float uFadeInner;
uniform float uFadeOuter;

varying vec2 vUv;

float getGridLine(vec2 coord) {
  vec2 grid = abs(fract(coord - 0.5) - 0.5);
  vec2 fw = fwidth(coord);
  float thickness = uLineThickness / uDivisions;
  float lineX = 1.0 - smoothstep(thickness - fw.x, thickness + fw.x, grid.x);
  float lineY = 1.0 - smoothstep(thickness - fw.y, thickness + fw.y, grid.y);
  return max(lineX, lineY);
}

void main() {
  vec2 coord = vUv * uDivisions;
  float gridLine = getGridLine(coord);

  vec2 centeredUv = vUv * 2.0 - 1.0;
  float radialDistance = length(centeredUv);
  float edgeFade = 1.0 - smoothstep(uFadeInner, uFadeOuter, radialDistance);

  float alpha = gridLine * edgeFade * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`;
export function GroundPlane() {
    const gridUniforms = useMemo(() => ({
        uColor: { value: new Color(GROUND_GRID_COLOR) },
        uDivisions: { value: GROUND_GRID_DIVISIONS },
        uLineThickness: { value: GROUND_GRID_LINE_THICKNESS },
        uOpacity: { value: GROUND_GRID_OPACITY },
        uFadeInner: { value: GROUND_GRID_FADE_INNER },
        uFadeOuter: { value: GROUND_GRID_FADE_OUTER },
    }), []);
    return (_jsxs("group", { children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0], children: [_jsx("planeGeometry", { args: [GROUND_GRID_SIZE, GROUND_GRID_SIZE] }), _jsx("meshBasicMaterial", { color: GROUND_FLOOR_COLOR })] }), _jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.002, 0], children: [_jsx("planeGeometry", { args: [GROUND_GRID_SIZE, GROUND_GRID_SIZE] }), _jsx("shaderMaterial", { uniforms: gridUniforms, vertexShader: GRID_VERTEX_SHADER, fragmentShader: GRID_FRAGMENT_SHADER, transparent: true, side: DoubleSide, depthTest: true, depthWrite: false })] })] }));
}
//# sourceMappingURL=GroundPlane.js.map