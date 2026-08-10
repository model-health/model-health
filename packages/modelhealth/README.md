# Model Health SDK for TypeScript

TypeScript/JavaScript SDK for the Model Health biomechanics platform.

## Features

- 📦 **Type-safe**: Full TypeScript type definitions
- 🌐 **Cross-platform**: Works in browsers, Node.js, React, Vue, Svelte, etc.
- 🔒 **API key authentication**: Use your Model Health API key
- ⚡ **Fast**: WASM performance with JavaScript ergonomics

## Installation

```bash
npm install @modelhealth/modelhealth
```

## Quick Start

```typescript
import { ModelHealthClient } from '@modelhealth/modelhealth';

const client = new ModelHealthClient({
  apiKey: 'your-api-key-here',
});
await client.init();

const sessions = await client.sessionList();
console.log(sessions);
```

## Configuration

### Optional: Disable auto-init

```typescript
const client = new ModelHealthClient({
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

### Activities

```typescript
// Get activities for a session
const activities = await client.activityList('session-id');

// Download activity videos
const videos = await client.downloadActivityVideos(
  activity,
  'raw' // or 'synced'
);

// Download result data
const results = await client.downloadActivityResultData(
  activity,
  ['kinematics_mot', 'kinematics_csv']
);
```

## React Example

```tsx
import { useState, useEffect } from 'react';
import { ModelHealthClient, Session } from '@modelhealth/modelhealth';

function App() {
  const [client] = useState(
    () => new ModelHealthClient({ apiKey: 'your-api-key' })
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

  if (loading)
    return <div>Loading...</div>;

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

If using Vite, exclude the SDK from dependency pre-bundling:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@modelhealth/modelhealth'],
  },
});
```

## TypeScript Types

All types are fully documented with JSDoc comments. Import types as needed:

```typescript
import type {
  Session,
  Subject,
  Activity,
  CheckerboardDetails,
  // ... etc
} from '@modelhealth/modelhealth';
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

## Platform Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 18+ (with WASM support)
- ✅ React, Vue, Svelte, Angular
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

Apache-2.0 © Model Health

## Support

- Documentation: https://sdk.modelhealth.io
- Issues: https://github.com/model-health/model-health/issues
- Email: support@modelhealth.io
