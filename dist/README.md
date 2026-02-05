# Model Health SDK for TypeScript

TypeScript/JavaScript SDK for the Model Health biomechanics platform.

## Features

- 📦 **Type-safe**: Full TypeScript type definitions
- 🌐 **Cross-platform**: Works in browsers, Node.js, React, Vue, Svelte, etc.
- 🔒 **Secure**: Pluggable storage system for authentication tokens
- ⚡ **Fast**: WASM performance with JavaScript ergonomics

## Installation

```bash
npm install @modelhealth/sdk
```

## Quick Start

```typescript
import { ModelHealthService } from '@modelhealth/sdk';

// Create client
const client = new ModelHealthService();
await client.init();

// Login
const result = await client.login('username', 'password');
if (result === 'verification_r_equired') {
  await client.verify('123456', true);
}

// Get sessions
const sessions = await client.sessionList();
console.log(sessions);
```

## Configuration

### Development Mode

```typescript
const client = new ModelHealthService({
  development: true, // Use development API endpoint
});
```

### Custom Token Storage

By default, the SDK uses in-memory token storage (tokens are lost on page refresh). For production, implement secure token storage:

```typescript
import { ModelHealthService, TokenStorage } from '@modelhealth/sdk';

// Option 1: Use provided LocalStorage implementation (basic security)
import { LocalStorageTokenStorage } from '@modelhealth/sdk';

const client = new ModelHealthService({
  storage: new LocalStorageTokenStorage(),
});

// Option 2: Implement your own secure storage
class SecureTokenStorage implements TokenStorage {
  async getToken(): Promise<string | null> {
    // Your secure storage implementation
    // Examples: encrypted IndexedDB, secure cookies, etc.
  }

  async setToken(token: string): Promise<void> {
    // Store token securely
  }

  async removeToken(): Promise<void> {
    // Remove token
  }
}

const secureClient = new ModelHealthService({
  storage: new SecureTokenStorage(),
});
```

### Storage Security Recommendations

**Development:**
- `MemoryTokenStorage`: Quick testing (default, not persistent)
- `LocalStorageTokenStorage`: Simple persistence (basic security)

**Production:**
- Encrypted IndexedDB with Web Crypto API
- HttpOnly cookies with SameSite protection and CSRF tokens
- Platform-specific secure storage (React Native: Keychain/Keystore)

**Never:**
- Store tokens in plain localStorage in production
- Log tokens to console
- Embed tokens in URLs

## API Reference

### Authentication

```typescript
// Register new account
await client.register({
  username: 'user',
  email: 'user@example.com',
  password: 'secure_password',
  firstName: 'John',
  lastName: 'Doe',
  newsletter: true,
  // Optional fields
  country: 'US',
  institution: 'University',
  profession: 'Researcher',
  unit: 'metric',
});

// Login
const result = await client.login('username', 'password');

// Verify 2FA code
if (result === 'verification_required') {
  await client.verify('123456', true);
}

// Check authentication status
const isAuth = await client.isAuthenticated();

// Logout
await client.logout();

// Manual token management
const token = client.getToken();
client.setToken('your-token');
```

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
  const [client] = useState(() => new ModelHealthService());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await client.init();
      
      // Try to restore session
      const isAuth = await client.isAuthenticated();
      if (!isAuth) {
        // Redirect to login
        return;
      }
      
      // Load sessions
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
  LoginResult,
  RegistrationParameters,
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
  await client.login('username', 'password');
} catch (error) {
  console.error('Login failed:', error);
}
```

## License

MIT © Model Health

## Support

- Documentation: https://docs.modelhealth.io
- Issues: https://github.com/model-health/model-health/issues
- Email: support@modelhealth.io
