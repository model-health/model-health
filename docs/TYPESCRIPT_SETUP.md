# TypeScript/WASM Setup Guide

Complete guide to building and using the ModelHealth TypeScript SDK.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Rust** 1.70+ ([rustup.rs](https://rustup.rs))
- **wasm-pack** (install with `cargo install wasm-pack`)
- **npm** or **yarn**

## Project Structure

```
model-health/
├── model-health-core/         # Rust core library
├── model-health-ffi/          # C FFI bindings (for iOS)
├── model-health-wasm/         # WASM bindings (NEW)
├── model-health-ts/           # TypeScript package (NEW)
│   ├── src/
│   │   ├── index.ts          # Main client
│   │   └── types.ts          # Type definitions
│   ├── wasm/                 # Generated WASM files
│   ├── dist/                 # Compiled TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── model-health-swift/        # Swift package (for iOS)
├── examples/
│   └── vite-react/           # Example React app (NEW)
└── docs/
    ├── WEB_TOKEN_STORAGE.md  # Security guide
    └── TYPESCRIPT.md         # API comparison
```

## Building the SDK

### 1. Build WASM Module

```bash
# From project root
cd model-health-wasm

# Development build (faster, larger)
wasm-pack build --target web --out-dir ../model-health-ts/wasm --dev

# Production build (optimized, smaller)
wasm-pack build --target web --out-dir ../model-health-ts/wasm
```

This generates:
- `model_health_wasm.js` - JavaScript bindings
- `model_health_wasm_bg.wasm` - WebAssembly binary
- `model_health_wasm.d.ts` - TypeScript definitions
- `package.json` - Package metadata

### 2. Build TypeScript Package

```bash
cd ../model-health-ts

# Install dependencies
npm install

# Build TypeScript
npm run build
```

This generates:
- `dist/` - Compiled JavaScript + type definitions
- Ready for publishing to npm

### 3. Use the Build Script

Or use the convenience script:

```bash
# From project root
chmod +x scripts/build-wasm.sh

# Development build
./scripts/build-wasm.sh dev

# Production build
./scripts/build-wasm.sh
```

## Using the SDK in Your Project

### Option 1: Link Locally (Development)

```bash
# In model-health-ts directory
npm link

# In your project
npm link @modelhealth/sdk
```

### Option 2: Install from npm (Production)

```bash
npm install @modelhealth/sdk
```

### Option 3: Use Directly (Example App)

```json
// package.json
{
  "dependencies": {
    "@modelhealth/sdk": "file:../model-health-ts"
  }
}
```

## Vite Setup

### 1. Install Plugins

```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
```

### 2. Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  server: {
    fs: {
      allow: ['..'], // Allow serving files from parent directory
    },
  },
  optimizeDeps: {
    exclude: ['@modelhealth/sdk'], // Don't pre-bundle WASM
  },
})
```

### 3. Use in Your App

```typescript
import { ModelHealthService } from '@modelhealth/sdk';

const client = new ModelHealthService();
await client.init(); // Initialize WASM

// Use the client
const sessions = await client.sessionList();
```

## Webpack Setup

### 1. Install Loaders

```bash
npm install -D @wasm-tool/wasm-pack-plugin
```

### 2. Configure Webpack

```javascript
// webpack.config.js
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const path = require('path');

module.exports = {
  // ... other config
  plugins: [
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, '../model-health-wasm'),
      outDir: path.resolve(__dirname, 'node_modules/@modelhealth/sdk/wasm'),
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};
```

## Running the Example App

### 1. Build the SDK

```bash
cd model-health-wasm
wasm-pack build --target web --out-dir ../model-health-ts/wasm --dev

cd ../model-health-ts
npm install
npm run build:ts
```

### 2. Run the Example

```bash
cd ../examples/vite-react
npm install
npm run dev
```

Open http://localhost:5173

## Troubleshooting

### WASM Module Not Found

**Error:** `Failed to load WASM module`

**Solution:**
1. Ensure `wasm-pack` is installed: `cargo install wasm-pack`
2. Build WASM: `cd model-health-wasm && wasm-pack build --target web`
3. Check output directory: `ls model-health-ts/wasm/`

### Import Errors

**Error:** `Cannot find module '@modelhealth/sdk'`

**Solution:**
1. Ensure TypeScript is built: `cd model-health-ts && npm run build`
2. Check package.json `main` and `types` fields
3. Try `npm install` again

### CORS Errors

**Error:** `CORS policy blocked`

**Solution:**
1. Ensure API server has CORS headers configured
2. For development, use proxy in vite.config.ts:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.modelhealth.io',
        changeOrigin: true,
      },
    },
  },
})
```

### TypeScript Errors

**Error:** `Type 'X' is not assignable to type 'Y'`

**Solution:**
1. Ensure you're using the correct SDK version
2. Regenerate WASM types: `wasm-pack build`
3. Rebuild TypeScript: `npm run build:ts`

### Memory Issues

**Error:** `Out of memory` or slow performance

**Solution:**
1. Use production build: `wasm-pack build` (without `--dev`)
2. Enable optimization in Cargo.toml:

```toml
[profile.release]
opt-level = "z"  # Optimize for size
lto = true       # Link-time optimization
```

## Development Workflow

### Watch Mode

Terminal 1 - WASM:
```bash
cd model-health-wasm
cargo watch -x 'build --target wasm32-unknown-unknown'
```

Terminal 2 - TypeScript:
```bash
cd model-health-ts
npm run dev  # tsc --watch
```

Terminal 3 - Example App:
```bash
cd examples/vite-react
npm run dev
```

### Testing

```bash
# Rust tests
cd model-health-core
cargo test

# TypeScript tests (TODO: add test framework)
cd model-health-ts
npm test
```

## Publishing

### 1. Update Version

```bash
cd model-health-ts
npm version patch  # or minor, major
```

### 2. Build Release

```bash
# Build WASM in release mode
cd ../model-health-wasm
wasm-pack build --target web --out-dir ../model-health-ts/wasm

# Build TypeScript
cd ../model-health-ts
npm run build
```

### 3. Publish to npm

```bash
npm publish --access public
```

## Environment Configuration

### Development

```typescript
const client = new ModelHealthService({
  development: true,  // Uses dev API
  storage: new LocalStorageTokenStorage(),
});
```

### Production

```typescript
const client = new ModelHealthService({
  development: false, // Uses production API (default)
  storage: new EncryptedIndexedDBStorage(),
});
```

## Platform-Specific Notes

### Browser Support

- ✅ Chrome 57+
- ✅ Firefox 52+
- ✅ Safari 11+
- ✅ Edge 79+

Requires:
- WebAssembly support
- ES2020+ features
- Async/await support

### Node.js

Node.js 18+ with `--experimental-wasm-modules` flag:

```bash
node --experimental-wasm-modules your-script.js
```

Or use a bundler (Webpack, Rollup) to handle WASM.

### React Native

Not directly supported. Use the native iOS/Android SDKs instead.

## Performance Optimization

### 1. Code Splitting

```typescript
// Lazy load the SDK
const loadSDK = async () => {
  const { ModelHealthService } = await import('@modelhealth/sdk');
  return new ModelHealthService();
};
```

### 2. WASM Streaming

```typescript
// Vite automatically uses streaming compilation
// No additional configuration needed
```

### 3. Caching

```typescript
// Service worker to cache WASM module
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('modelhealth-v1').then((cache) => {
      return cache.addAll([
        '/wasm/model_health_wasm_bg.wasm',
      ]);
    })
  );
});
```

## Next Steps

1. Review [WEB_TOKEN_STORAGE.md](../docs/WEB_TOKEN_STORAGE.md) for security
2. Check out the [example app](../examples/vite-react)
3. Read the [API reference](../docs/SDK_REFERENCE.md)
4. Join our [Discord](https://discord.gg/modelhealth) for support

## Resources

- [wasm-bindgen docs](https://rustwasm.github.io/wasm-bindgen/)
- [wasm-pack guide](https://rustwasm.github.io/wasm-pack/)
- [MDN WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Vite WASM guide](https://vitejs.dev/guide/features.html#webassembly)
