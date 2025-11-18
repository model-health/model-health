# ``ModelHealth``

Professional biomechanical analysis from smartphone videos.

## Overview

The ModelHealth SDK enables you to measure and analyze human movement using smartphone cameras. Transform video recordings into detailed biomechanical metrics for sports performance, rehabilitation, and clinical assessment.

## Quick Start

### Installation

Add ModelHealth to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/modelhealth/ios-sdk.git", from: "0.1.0")
]
```

### Minimal Example

```swift
import ModelHealth

let service = ModelHealthService()

// 1. Authenticate
let result = try await service.login(username: "user@example.com", password: "pass")
if case .verificationRequired = result {
    try await service.verify(code: "123456", rememberDevice: true)
}

// 2. Create session & calibrate
let session = try await service.createSession()
let details = CheckerboardDetails(rows: 4, columns: 5, squareSize: 35, placement: .perpendicular)
try await service.calibrateCamera(session, checkerboardDetails: details) { status in }

// 3. Capture neutral pose
let subject = try await service.subjectList().first!
try await service.calibrateNeutralPose(for: subject, in: session) { status in }

// 4. Record movement
let trial = try await service.record(trialNamed: "Test", in: session)
// Subject performs movement...
try await service.stopRecording(session)

// 5. Wait for processing, then analyze
var status = try await service.getStatus(forTrial: trial)
while status != .ready {
    try await Task.sleep(nanoseconds: 2_000_000_000)
    status = try await service.getStatus(forTrial: trial)
}
let task = try await service.startAnalysis(.counterMovementJump, for: trial, in: session)
let result = try await service.downloadAnalysisResult(forTrial: trial, resultTag: "cmj")
```

### Workflow Overview

The SDK follows a 5-step workflow:

1. **Authentication** - Login and optional email verification
2. **Camera Calibration** - Calibrate cameras with checkerboard pattern
3. **Neutral Pose** - Capture subject's standing pose for scaling
4. **Recording** - Record dynamic movement trial and wait for processing
5. **Analysis** - Start analysis, poll for completion, download results

See the demo app for a complete example implementation.

## Topics

### Getting Started

- ``ModelHealthService``
- ``ModelHealthProvider``

### Data Types

- ``Session``
- ``Subject``
- ``Trial``
- ``Video``
- ``CheckerboardDetails``
- ``CalibrationStatus``
- ``TrialProcessingStatus``
- ``AnalysisTask``
- ``AnalysisResult``
- ``LoginResult``
- ``AnalysisType``
- ``ModelHealthError``
