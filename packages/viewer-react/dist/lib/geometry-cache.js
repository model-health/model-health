import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
const geometryCache = new Map();
/** Load an OBJ once and reuse the parsed group across viewer instances. */
export async function loadCachedObj(url) {
    const cached = geometryCache.get(url);
    if (cached) {
        return cached;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load OBJ: ${response.status} ${url}`);
    }
    const text = await response.text();
    const parsed = new OBJLoader().parse(text);
    geometryCache.set(url, parsed);
    return parsed;
}
//# sourceMappingURL=geometry-cache.js.map