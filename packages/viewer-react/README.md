# Model Health Viewer for React

Embeddable React Three Fiber 3D visualizer for the Model Health biomechanics platform.
Renders an activity's `animation` motion data as an interactive skeletal replay — the
same 3D view used in the Model Health web app — directly inside your own React app.

## Features

- 🦴 **Skeletal playback**: Renders processed activity animation data in 3D
- 🎮 **Imperative playback control**: `play`/`pause`/`seek`/`step`/speed via a `ref`, no built-in UI imposed
- 📍 **Marker & vector overlays**: Optional augmented marker positions and left/right vector overlays
- 🧩 **Bring your own controls**: Ships a ready-made `<PlaybackControls>` component, or build your own against the same handle

## Installation

```bash
npm install @modelhealth/viewer-react @modelhealth/modelhealth
```

`@modelhealth/viewer-react` peer-depends on `@modelhealth/modelhealth`, React 19,
`three`, `@react-three/fiber` and `@react-three/drei` — make sure those are installed
alongside it.

Import the bundled stylesheet once, alongside your first use of `View3D`:

```typescript
import '@modelhealth/viewer-react/styles.css';
```

## Quick Start

```tsx
import { useRef } from 'react';
import { ModelHealthService } from '@modelhealth/modelhealth';
import { View3D, fetchAnimationTransforms } from '@modelhealth/viewer-react';
import type { View3DHandle } from '@modelhealth/viewer-react';
import '@modelhealth/viewer-react/styles.css';

function ActivityViewer({ service, activity }) {
  const viewerRef = useRef<View3DHandle>(null);
  const [transforms, setTransforms] = useState(null);

  useEffect(() => {
    fetchAnimationTransforms(service, activity).then(setTransforms);
  }, [service, activity]);

  if (!transforms) return <div>Loading...</div>;

  return <View3D ref={viewerRef} transforms={transforms} />;
}
```

`fetchAnimationTransforms` fetches and parses the activity's `animation` motion data
in one call. `View3D` renders no built-in play/pause/scrubber UI — drive playback
yourself via the `ref`, or use the exported `<PlaybackControls>` below.

## Playback Controls

The `ref` exposes imperative playback control:

```typescript
viewerRef.current?.play();
viewerRef.current?.pause();
viewerRef.current?.seek(time);
viewerRef.current?.step(1); // or -1 to step backward
viewerRef.current?.setPlaybackSpeed(2);

viewerRef.current?.currentTime;
viewerRef.current?.duration;
viewerRef.current?.isPlaying;
viewerRef.current?.playbackSpeed;
```

Or use the ready-made `<PlaybackControls>` component instead of building your own:

```tsx
import { PlaybackControls } from '@modelhealth/viewer-react';

<PlaybackControls
  currentTime={viewerRef.current?.currentTime ?? 0}
  duration={viewerRef.current?.duration ?? 0}
  playing={playing}
  playbackSpeed={playbackSpeed}
  onTimeChange={(time) => viewerRef.current?.seek(time)}
  onPlayingChange={(next) => (next ? viewerRef.current?.play() : viewerRef.current?.pause())}
  onPlaybackSpeedChange={setPlaybackSpeed}
  onStep={(direction) => viewerRef.current?.step(direction)}
/>
```

`onPlayingChange` and `onDurationChange` props on `View3D` itself keep an external
play/pause toggle or scrubber range in sync with the viewer's actual state.

## Overlays

**Markers** — pass one or more augmented marker layers via the `markers` prop:

```typescript
import { fetchMarkerTransforms } from '@modelhealth/viewer-react';

const markerTransforms = await fetchMarkerTransforms(service, activity);
```

```tsx
<View3D
  transforms={transforms}
  markers={markerTransforms ? [{ id: 'post', label: 'Markers', transforms: markerTransforms }] : []}
/>
```

**Vector overlay** — an optional left/right vector overlay. This isn't backed by a dedicated SDK motion data type: upload your own external data tagged with a name of your choosing, then fetch the synced `.sto`
result the backend produces for it:

```typescript
import { fetchExternalSto, parseExternalSto } from '@modelhealth/viewer-react';

// Upload external data (any format) tagged "my-data" via the SDK, then:
const sto = await fetchExternalSto(service, activity, 'my-data');
const overlay = sto ? parseExternalSto(sto) : undefined;
```

```tsx
<View3D transforms={transforms} overlay={overlay} />
```

## API Reference

- `View3D` — the viewer component. Props: `transforms`, `markers`, `overlay`, `color`,
  `geometryBaseUrl`, `skipGeometries`, `trackedBodyKey`, `className`, `onPlayingChange`,
  `onDurationChange`.
- `PlaybackControls` — ready-made playback UI, driven entirely by props/callbacks.
- `fetchAnimationTransforms(client, activity)` — fetches and parses `animation` motion data.
- `fetchMarkerTransforms(client, activity)` — fetches and parses `markers_csv` motion data; returns `null` if unavailable.
- `fetchExternalSto(client, activity, tag)` / `parseExternalSto(sto)` — fetch and parse a synced external `.sto` overlay result.
- `parseMarkersCsv(csv)` — parses the wide-format marker CSV directly, if you already have it.

Lower-level building blocks (`Scene3D`, `Body3D`, `MarkerOverlay`, `VectorOverlay`,
`CameraControls`) are also exported for composing a custom scene.

## Vite Configuration

If using Vite, exclude the SDK from dependency pre-bundling (same as the core SDK):

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@modelhealth/modelhealth'],
  },
});
```

## Troubleshooting

- **No animation data available** — the activity hasn't finished processing yet, or
  has no `animation` motion data type. Wait for `.ready` status first.
  `fetchAnimationTransforms` throws in this case.
- **Overlay not appearing** — `fetchExternalSto` returns `null` rather than throwing
  if the tagged file doesn't exist or hasn't been synced yet. Confirm the tag you
  passed matches what the file was uploaded under, and that a `-sync` result exists.

## Building from Source

```bash
npm install
npm run build

# Development build with watch mode
npm run dev
```

### Requirements

- Node.js 18+
- React 19+

## License

Apache-2.0 © Model Health

## Support

- Documentation: https://sdk.modelhealth.io
- Issues: https://github.com/model-health/model-health/issues
- Email: support@modelhealth.io
