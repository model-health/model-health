# Model Health SDK Architecture

Internal documentation for developers working on the Model Health SDK.

## Purpose & Vision

### Why This Project Exists

The Model Health SDK represents a strategic investment in cross-platform code sharing and developer experience.

**Core Problems:**
- Building separate SDKs for iOS, Android, Web and potentially multiple Desktops creates at least a 4x development cost
- Business logic divergence across platforms leads to inconsistent behaviour
- Bug fixes must be replicated across codebases
- New features take months to reach all platforms

**Strategic Solution:**
- Common core in Rust with language bindings for all target platforms
- Single source of truth for business logic and API contracts
- Faster feature delivery across all platforms simultaneously
- Reduced maintenance burden and bug surface area

### Current State: iOS First

This iOS SDK is the **reference implementation** and **priority deliverable**. It establishes:
- API design patterns for all future SDKs
- Documentation standards and structure
- Developer experience expectations
- Integration patterns with Model Health backend

While built in Swift for iOS, the public API is designed to be **binding-friendly** - simple async/await 
patterns that map cleanly to Rust futures and can be exposed to e.g. TypeScript, Kotlin, Java, C++ etc.

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────┐
│            ModelHealthService               │
│       (Public API - Async/Await)        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│            BackendService               │
│    (Protocol - Business Logic Layer)    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│            BackendServiceImpl           │
│  (HTTP Client, Auth, State Management)  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Model Health Cloud APIs          │
│           (REST endpoints)              │
└─────────────────────────────────────────┘
```

### Design Principles

1. **Thin Public API**
   - All methods are simple async/await with clear inputs/outputs
   - No complex delegates, closures, or Swift-specific patterns
   - Easy to mirror in other languages

2. **Protocol-Based Abstraction**
   - `BackendService` protocol defines all backend operations
   - Makes testing trivial (mock implementations)
   - Isolates HTTP/networking concerns from business logic

3. **Immutable Data Models**
   - All models are `Sendable` structs, which means they're thread safe
   - No mutable state in public types
   - Maps cleanly to Rust's ownership model

## Migration Path to Rust

### Phase 1: Current (iOS Swift)
**Timeline:** Now - 2 weeks  
**Status:** ✅ In Progress

- Pure Swift implementation
- Establishes API contracts
- Validates developer experience
- Generates initial documentation

### Phase 2: Rust Core Implementation
**Timeline:** ~2 weeks from now  
**Status:** 🔄 Upcoming

- Reimplement `BackendService` in Rust
- Create C FFI layer
- Generate Swift bindings with UniFFI or similar
- Keep public API identical (drop-in replacement)

**Why Rust:**
- Memory safety without garbage collection
- Excellent FFI story (C-compatible ABI)
- Strong async/concurrency primitives
- Cross-platform tooling (cargo, rustfmt, clippy)
- Growing ecosystem for mobile development

### Phase 3: Additional Platform Bindings
**Timeline:** ~3 weeks from now  
**Status:** 🔮 Planned

From the Rust core, generate bindings for:
- **JavaScript/TypeScript** - via WASM or napi-rs for Node/React Native
- **Kotlin/Android** - via JNI bindings
- **C++** - direct FFI consumption
- **Java** - via JNI (if needed separately from Kotlin)

**Binding Strategy:**
- Use code generation where possible (UniFFI, cbindgen, etc.)
- Keep platform-specific wrapper code minimal
- Platform wrappers handle only: async bridging, error conversion

## Key Implementation Details

### Authentication Flow

```
login(username, password)
    ↓
BackendService.login()
    ↓
POST /api/auth/login
    ↓
Response: { requires_verification: bool }
    ↓
Return: LoginResult.ok | .verificationRequired
    ↓
[if verification required]
    ↓
verify(code, rememberDevice)
    ↓
POST /api/auth/verify
    ↓
Store session token
```

**Session Management:**
- Session tokens stored in Keychain (iOS)
- 90-day device trust if `rememberDevice: true`
- Token refresh handled automatically in BackendService

### Video Trigger Flow

Video recording is automatically triggered on Model Health iOS app:

```
recordTrial(named: "squat")
    ↓
BackendService starts upload stream
    ↓
iOS Device Camera captures frames
    ↓
stopRecording(trialId)
    ↓
Upload to S3 via presigned URLs
    ↓
Backend processes videos
```

### Calibration Pipeline

```
createSession()
    ↓
calibrateCamera(session, checkerboard)
    ↓
  [N cameras capture checkerboard from multiple angles]
    ↓
  [Backend computes intrinsic/extrinsic parameters]
    ↓
calibrateNeutralPose()
    ↓
  [N cameras capture standing pose video]
    ↓
  [Backend scales model to subject dimensions]
    ↓
Ready for trial recording
```

## Data Models

All models are designed to be **FFI-friendly**:

- No reference types (all structs/enums)
- No Swift-specific features (AnyObject, @objc, etc)
- Simple types: String, Int, Double, Bool, Array, Date
- Enums are string-backed (easy to serialize)

### Example: Subject Model

```swift
public struct Subject: Decodable, Sendable {
    public let id: Int
    public let name: String
    public let weight: Double?
    public let height: Double?
    // ...
}
```

Maps to Rust:
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Subject {
    pub id: i32,
    pub name: String,
    pub weight: Option<f64>,
    pub height: Option<f64>,
    // ...
}
```

## Testing Strategy

### Current (Swift)
- Unit tests for BackendService mock
- Integration tests against staging API

### Future (Rust)
- Core business logic tests in Rust
- Binding smoke tests per platform
- Shared integration test suite (JSON fixtures)

## Documentation Strategy

Documentation must be **generated and maintainable** across all platforms:

1. **Source Documentation**
   - Swift: Swift-DocC comments
   - Rust: rustdoc comments
   - Maintain parallel documentation during transition

2. **Generated Outputs**
   - **Web**: Swift-DocC → static site (currently)
   - **Web**: rustdoc → static site (future)
   - **Markdown**: Extracted from Swift-DocC for GitHub (currently)
   - **Markdown**: Extracted from rustdoc for GitHub (future)

## Development Workflow

### Adding a New API Method

1. **Define in Protocol**
   ```swift
   protocol BackendService {
       func newMethod(param: Type) async throws -> Result
   }
   ```

2. **Implement in Service**
   ```swift
   func newMethod(param: Type) async throws -> Result {
       // HTTP call, error handling
   }
   ```

3. **Expose in Public SDK**
   ```swift
   public func newMethod(param: Type) async throws -> Result {
       try await backendService.newMethod(param: param)
   }
   ```

4. **Document with DocC**
   ```swift
   /// Description of what it does.
   ///
   /// ```swift
   /// let result = try await service.newMethod(param: value)
   /// ```
   public func newMethod(param: Type) async throws -> Result
   ```

5. **Update Tests**

6. **Generate Documentation**
   ```bash
   make docs-markdown
   ```

7. Commit updated documentatin to git

### Rust Migration Checklist (Per Method)

- [ ] Define equivalent function in Rust core
- [ ] Add C FFI wrapper
- [ ] Generate Swift binding
- [ ] Verify behaviour matches
- [ ] Update documentation
- [ ] Run integration tests

## Performance Considerations

### Rust (Future)
- Shared memory between Swift/Rust reduces copies

## Security

### Authentication
- HTTPS only for all API calls
- Session tokens in Keychain (iOS) / Keystore (Android)
- Token rotation on device trust expiry

### API Keys
- No API keys embedded in SDK
- User authentication required for all operations except login
- Backend handles authorisation

## Known Limitations & Roadmap

### Current Limitations
- iOS only (Swift)
- Requires internet connection
- No offline recording buffer
- No real-time feedback during recording

### Near-Term (Rust Migration)
- Maintain iOS support
- Cross-platform foundation ready

### Long-Term
- React Native SDK (1+ month)
- Android SDK (3+ months)
- Desktop SDKs (Windows/macOS/Linux)

## Contributing

### Code Style
- Swift: Follow Swift API Design Guidelines
- Rust: Use rustfmt, follow Rust API Guidelines
- Both: Comprehensive documentation required

### Review Process
1. All API changes require design review
2. Documentation updated in same PR
3. Integration tests must pass
4. No breaking changes without major version bump

### Branching
- `main` - stable, release-ready
- `develop` - integration branch
- `feature/*` - new features
- `rust-core` - Rust migration work

## Questions?

Ping Warren!!
