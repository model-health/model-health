# Model Health SDK for TypeScript

TypeScript/JavaScript SDK for the Model Health biomechanics platform.

## Features

- 📦 **Type-safe**: Full TypeScript type definitions
- 🌐 **Cross-platform**: Works in browsers, Node.js, React, Vue, Svelte, etc.
- 🔒 **API key authentication**: Use your Model Health API key
- ⚡ **Fast**: WASM performance with JavaScript ergonomics

## Installation

```bash
npm install @modelhealth/sdk
```

## Quick Start

```typescript
import { ModelHealthService } from '@modelhealth/sdk';

const client = new ModelHealthService({
  apiKey: 'your-api-key-here',
});
await client.init();

const sessions = await client.sessionList();
console.log(sessions);
```

## Configuration

### Optional: Disable auto-init

```typescript
const client = new ModelHealthService({
  apiKey: 'your-api-key',
  autoInit: false, // Call init() manually when ready
});
```

## API Reference

### Sessions

```typescript
// Get all sessions
const sessions = await client.sessionList();

// Get specific session with trials
const session = await client.getSession('session-id');

// Create new session
const newSession = await client.createSession();
```

### Subjects

```typescript
// Get all subjects
const subjects = await client.subjectList();
```

### Trials

```typescript
// Get trials for a session
const trials = await client.trialList('session-id');

// Download trial videos
const videos = await client.downloadTrialVideos(
  trial,
  'raw' // or 'synced'
);

// Download result data
const results = await client.downloadTrialResultData(
  trial,
  ['motData', 'csvData']
);
```

### Utilities

```typescript
// Convert MOT to CSV
const motData = new Uint8Array([...]); // MOT file data
const csv = ModelHealthService.motToCsv(motData);
```

## React Example

```tsx
import { useState, useEffect } from 'react';
import { ModelHealthService, Session } from '@modelhealth/sdk';

function App() {
  const [client] = useState(
    () => new ModelHealthService({ apiKey: 'your-api-key' })
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await client.init();
      const data = await client.sessionList();
      setSessions(data);
      setLoading(false);
    }
    
    init();
  }, [client]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Sessions</h1>
      {sessions.map(session => (
        <div key={session.id}>{session.name}</div>
      ))}
    </div>
  );
}
```

## Vite Configuration

If using Vite, add WASM support:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
  ],
});
```

Install plugins:
```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
```

## TypeScript Types

All types are fully documented with JSDoc comments. Import types as needed:

```typescript
import type {
  Session,
  Subject,
  Trial,
  CheckerboardDetails,
  // ... etc
} from '@modelhealth/sdk';
```

## Building from Source

```bash
# Install dependencies
npm install

# Build WASM and TypeScript
npm run build

# Development build with watch mode
npm run dev
```

### Requirements

- Node.js 18+
- Rust 1.70+
- wasm-pack (`cargo install wasm-pack`)

## Platform Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 18+ (with WASM support)
- ✅ React, Vue, Svelte, Angular
- ✅ React Native (with WASM bridge)
- ✅ Electron

## Error Handling

All async methods can throw errors. Always use try-catch:

```typescript
try {
  const sessions = await client.sessionList();
} catch (error) {
  console.error('Request failed:', error);
}
```

## License

MIT © Model Health

## Support

- Documentation: https://docs.modelhealth.io
- Issues: https://github.com/model-health/model-health/issues
- Email: support@modelhealth.io
