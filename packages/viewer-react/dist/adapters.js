/**
 * Parses the wide-format marker CSV produced by the SDK's `markers_csv` motion
 * data type (`frame,time,MARKER1_X,MARKER1_Y,MARKER1_Z,MARKER2_X,...`) into the
 * `MarkerTransforms` shape `MarkerOverlay` expects.
 *
 * There is no dedicated "marker positions as JSON" motion data type in the SDK
 * today (unlike `VisualizerTransforms`, which is a purpose-built JSON payload) —
 * this parses the general-purpose CSV export instead.
 */
export function parseMarkersCsv(csv) {
    const lines = csv.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
        return { time: [], markers: {} };
    }
    const header = lines[0].split(',');
    const markerNames = [];
    for (let i = 2; i < header.length; i += 3) {
        const column = header[i];
        markerNames.push(column.endsWith('_X') ? column.slice(0, -2) : column);
    }
    const time = [];
    const markers = {};
    for (const name of markerNames) {
        markers[name] = [];
    }
    for (const line of lines.slice(1)) {
        const columns = line.split(',');
        if (columns.length < 2)
            continue;
        const frameTime = Number(columns[1]);
        if (Number.isNaN(frameTime))
            continue;
        time.push(frameTime);
        for (let i = 0; i < markerNames.length; i++) {
            const base = 2 + i * 3;
            const x = columns[base] ? Number(columns[base]) : 0;
            const y = columns[base + 1] ? Number(columns[base + 1]) : 0;
            const z = columns[base + 2] ? Number(columns[base + 2]) : 0;
            markers[markerNames[i]].push([x || 0, y || 0, z || 0]);
        }
    }
    return { time, markers };
}
/**
 * Parses an OpenSim `ExternalLoads` `.sto` file into the
 * `OverlayTransforms` shape `VectorOverlay` expects.
 *
 * Expects the fixed column layout: `time`, `leftFoot_v{x,y,z}`,
 * `leftFoot_p{x,y,z}`, `rightFoot_v{x,y,z}`, `rightFoot_p{x,y,z}` (torque
 * columns, `*_T{x,y,z}`, are present in the file but ignored — they aren't
 * part of `OverlayFootData`).
 */
export function parseExternalSto(sto) {
    const lines = sto.split('\n');
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('endheader')) {
            headerIndex = i + 1;
            break;
        }
    }
    const empty = { time: [], sides: { left: { origin: [], vector: [] }, right: { origin: [], vector: [] } } };
    if (headerIndex < 0 || headerIndex >= lines.length) {
        return empty;
    }
    const columnNames = lines[headerIndex].trim().split(/\s+/);
    const columnIndex = new Map();
    columnNames.forEach((name, index) => columnIndex.set(name, index));
    const requiredColumns = [
        'time',
        'leftFoot_vx', 'leftFoot_vy', 'leftFoot_vz',
        'leftFoot_px', 'leftFoot_py', 'leftFoot_pz',
        'rightFoot_vx', 'rightFoot_vy', 'rightFoot_vz',
        'rightFoot_px', 'rightFoot_py', 'rightFoot_pz',
    ];
    if (!requiredColumns.every((name) => columnIndex.has(name))) {
        return empty;
    }
    const time = [];
    const leftOrigin = [];
    const leftVector = [];
    const rightOrigin = [];
    const rightVector = [];
    const at = (columns, name) => Number(columns[columnIndex.get(name)]);
    for (const line of lines.slice(headerIndex + 1)) {
        if (line.trim().length === 0)
            continue;
        const columns = line.trim().split(/\s+/);
        time.push(at(columns, 'time'));
        leftVector.push([at(columns, 'leftFoot_vx'), at(columns, 'leftFoot_vy'), at(columns, 'leftFoot_vz')]);
        leftOrigin.push([at(columns, 'leftFoot_px'), at(columns, 'leftFoot_py'), at(columns, 'leftFoot_pz')]);
        rightVector.push([at(columns, 'rightFoot_vx'), at(columns, 'rightFoot_vy'), at(columns, 'rightFoot_vz')]);
        rightOrigin.push([at(columns, 'rightFoot_px'), at(columns, 'rightFoot_py'), at(columns, 'rightFoot_pz')]);
    }
    return {
        time,
        sides: {
            left: { origin: leftOrigin, vector: leftVector },
            right: { origin: rightOrigin, vector: rightVector },
        },
    };
}
/**
 * Downloads and parses an activity's 3D animation data.
 *
 * ```typescript
 * const transforms = await fetchAnimationTransforms(client, activity);
 * ```
 *
 * @throws If the activity has no `animation` result available.
 */
export async function fetchAnimationTransforms(client, activity) {
    const results = await client.motionDataForActivity(activity, ['animation']);
    if (!results.length) {
        throw new Error('No animation data available for this activity');
    }
    const json = new TextDecoder().decode(results[0].data);
    return JSON.parse(json);
}
/**
 * Downloads and parses an activity's augmented marker positions.
 *
 * Returns `null` if no marker data is available, rather than throwing —
 * marker data is a supplementary overlay, not required for 3D playback.
 */
export async function fetchMarkerTransforms(client, activity) {
    const results = await client.motionDataForActivity(activity, ['markers_csv']);
    if (!results.length) {
        return null;
    }
    const csv = new TextDecoder().decode(results[0].data);
    return parseMarkersCsv(csv);
}
/**
 * Downloads the raw text of a `.sto` file tagged `` `${filename}-sync` `` for
 * an activity — `filename` is the tag you originally uploaded the file under;
 * the synced result is stored separately, which is what this fetches.
 *
 * Returns `null` rather than throwing if it doesn't exist (or any other fetch
 * failure) — pair it with a specific parser, e.g. `parseExternalSto`.
 */
export async function fetchExternalSto(client, activity, filename) {
    try {
        const results = await client.motionDataForActivity(activity, [
            { type: 'tagged', tag: `${filename}-sync`, extension: 'sto' },
        ]);
        if (!results.length) {
            return null;
        }
        return new TextDecoder().decode(results[0].data);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=adapters.js.map