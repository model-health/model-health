# Model Health SDK

Swift and TypeScript SDK for biomechanical analysis from smartphone videos.

## Installation

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/model-health/model-health.git", from: "0.1.7")
]
```

Or in Xcode:
1. File → Add Packages
2. Enter: `https://github.com/model-health/model-health.git`
3. Select version

### npm

```bash
npm install @modelhealth/sdk@0.1.7
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

**Full API Documentation**: [docs.modelhealth.io](https://docs.modelhealth.io)

## Examples

See the [`examples/`](./examples) directory for complete working implementations.

## Support

- **Issues**: [GitHub Issues](https://github.com/model-health/model-health/issues)
- **Email**: support@modelhealth.io

## Latest Release

**Version 0.1.7** - View [all releases](https://github.com/model-health/model-health/releases) for version history.
