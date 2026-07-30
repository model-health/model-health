import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Euler, Mesh, MeshPhongMaterial, } from 'three';
import { DEFAULT_MODEL_GEOMETRY_BASE_URL, DEFAULT_MODEL_SKIP_GEOMETRIES, } from '../config.js';
import { loadCachedObj } from '../lib/geometry-cache.js';
function vtpToObj(filename) {
    return filename.replace('.vtp', '.obj');
}
function getFrameIndex(currentTime, times) {
    if (times.length === 0)
        return 0;
    let left = 0;
    let right = times.length - 1;
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (times[mid] < currentTime) {
            left = mid + 1;
        }
        else {
            right = mid;
        }
    }
    return Math.max(0, Math.min(left, times.length - 1));
}
const MODEL_SPECULAR_COLOR = '#111111';
const MODEL_SHININESS = 36;
const MODEL_EMISSIVE_STRENGTH = 0.0005;
function hasColor(material) {
    const maybeColor = material.color;
    return typeof maybeColor === 'object' && typeof maybeColor.set === 'function';
}
function BodyPart({ bodyName, objs, scaleFactors, rotations, translations, frameIndexRef, color, baseX, baseZ, }) {
    const groupRef = useRef(null);
    const tintMaterial = (material) => {
        const clonedMaterial = material.clone();
        if (color && hasColor(clonedMaterial)) {
            clonedMaterial.color.set(color);
        }
        if (clonedMaterial instanceof MeshPhongMaterial) {
            const baseColor = hasColor(clonedMaterial)
                ? clonedMaterial.color.clone()
                : new Color('#ffffff');
            clonedMaterial.specular = new Color(MODEL_SPECULAR_COLOR);
            clonedMaterial.shininess = MODEL_SHININESS;
            clonedMaterial.emissive = baseColor.multiplyScalar(MODEL_EMISSIVE_STRENGTH);
            clonedMaterial.needsUpdate = true;
        }
        return clonedMaterial;
    };
    const clonedObjects = useMemo(() => {
        return objs.map((obj) => {
            const clone = obj.clone(true);
            clone.traverse((child) => {
                if (child instanceof Mesh) {
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map((material) => tintMaterial(material));
                    }
                    else {
                        child.material = tintMaterial(child.material);
                    }
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });
            return clone;
            // eslint-disable-next-line react-hooks/exhaustive-deps
        });
    }, [color, objs]);
    useFrame(() => {
        if (!groupRef.current)
            return;
        const frameIndex = frameIndexRef.current;
        const translation = translations.at(frameIndex);
        const rotation = rotations.at(frameIndex);
        if (!translation || !rotation)
            return;
        groupRef.current.position.set(translation[0] - baseX, translation[1], translation[2] - baseZ);
        groupRef.current.setRotationFromEuler(new Euler(rotation[0], rotation[1], rotation[2], 'XYZ'));
    });
    return (_jsx("group", { ref: groupRef, name: bodyName, scale: scaleFactors, children: clonedObjects.map((obj, index) => (_jsx("primitive", { object: obj }, `${bodyName}-${index}`))) }));
}
async function loadObj(url) {
    return loadCachedObj(url);
}
export function Body3D({ transforms, currentTimeRef, color, baseX, baseZ, endTime, onLoadingChange, geometryBaseUrl = DEFAULT_MODEL_GEOMETRY_BASE_URL, skipGeometries = DEFAULT_MODEL_SKIP_GEOMETRIES, }) {
    const frameIndexRef = useRef(0);
    const endTimeRef = useRef(endTime);
    const onLoadingChangeRef = useRef(onLoadingChange);
    const [objMap, setObjMap] = useState({});
    useEffect(() => {
        onLoadingChangeRef.current = onLoadingChange;
    }, [onLoadingChange]);
    useEffect(() => {
        endTimeRef.current = endTime;
    }, [endTime]);
    useFrame(() => {
        const currentTime = currentTimeRef.current ?? 0;
        const denominator = endTimeRef.current;
        if (denominator > 0) {
            const progress = Math.min(Math.max(currentTime / denominator, 0), 1);
            frameIndexRef.current = Math.round(progress * (transforms.time.length - 1));
        }
        else {
            frameIndexRef.current = getFrameIndex(currentTime, transforms.time);
        }
    });
    const bodyParts = useMemo(() => {
        return Object.entries(transforms.bodies)
            .map(([bodyName, bodyData]) => {
            const geometryUrls = bodyData.attachedGeometries
                .filter((geom) => !skipGeometries.includes(geom))
                .map((geom) => `${geometryBaseUrl}/${vtpToObj(geom)}`);
            if (geometryUrls.length === 0)
                return null;
            return {
                bodyName,
                geometryUrls,
                scaleFactors: bodyData.scaleFactors,
                rotations: bodyData.rotation,
                translations: bodyData.translation,
            };
        })
            .filter(Boolean);
    }, [transforms, geometryBaseUrl, skipGeometries]);
    const allGeometryUrls = useMemo(() => Array.from(new Set(bodyParts.flatMap((part) => part.geometryUrls))), [bodyParts]);
    useEffect(() => {
        let cancelled = false;
        setObjMap({});
        async function loadGeometries() {
            onLoadingChangeRef.current?.(true);
            await Promise.all(allGeometryUrls.map(async (url) => {
                try {
                    const obj = await loadObj(url);
                    if (!cancelled) {
                        setObjMap((prev) => ({ ...prev, [url]: obj }));
                    }
                }
                catch (error) {
                    console.error(error);
                }
            }));
            if (!cancelled) {
                onLoadingChangeRef.current?.(false);
            }
        }
        if (allGeometryUrls.length === 0) {
            onLoadingChangeRef.current?.(false);
            return;
        }
        loadGeometries();
        return () => {
            cancelled = true;
        };
    }, [allGeometryUrls]);
    if (Object.keys(objMap).length === 0)
        return null;
    return (_jsx("group", { children: bodyParts.map((part) => (_jsx(BodyPart, { bodyName: part.bodyName, objs: part.geometryUrls
                .map((url) => objMap[url])
                .filter((obj) => Boolean(obj)), scaleFactors: part.scaleFactors, rotations: part.rotations, translations: part.translations, frameIndexRef: frameIndexRef, color: color, baseX: baseX, baseZ: baseZ }, part.bodyName))) }));
}
//# sourceMappingURL=Body3D.js.map