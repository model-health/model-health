# Model Health SDK

Swift and TypeScript SDK for biomechanical analysis from smartphone videos.

## Installation

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/model-health/model-health.git", from: "1.0.0")
]
```

### npm

```bash
npm install @modelhealth/sdk
```

## Quick Start

### Swift

```swift
import ModelHealth

let service = ModelHealthService()
let result = try await service.login(username: "user@example.com", password: "password")
```

### TypeScript

```typescript
import { ModelHealthService } from '@modelhealth/sdk';

const service = new ModelHealthService();
await service.login('user@example.com', 'password');
```

## Documentation

- [Swift Documentation](./sdk-docs/swift/)
- [TypeScript Documentation](./sdk-docs/typescript/)

## Examples

See the `examples/` directory.

## License

MIT
