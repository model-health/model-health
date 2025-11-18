# ModelHealth SDK

Swift SDK for measuring and analyzing human movement from smartphone videos.

## Overview

The ModelHealth SDK enables movement practitioners to capture biomechanical data using smartphone cameras and receive actionable insights to improve performance and health. The SDK provides a complete workflow from authentication through data collection to analysis.

## What Problem Does It Solve?

Traditional biomechanical analysis requires expensive lab equipment (force plates, motion capture systems) and specialized expertise. ModelHealth democratizes movement analysis by:

- **Eliminating expensive equipment** - Use standard smartphone cameras instead of $50k+ motion capture systems
- **Enabling field testing** - Collect data anywhere, not just in specialized labs
- **Automating analysis** - Complex biomechanics calculated automatically, no PhD required
- **Providing immediate feedback** - Results available minutes after recording, not days

## Key Features

- **Multi-camera calibration** - Automated camera calibration using checkerboard patterns
- **3D motion capture** - Reconstruct 3D movement from 2D smartphone videos
- **Biomechanical analysis** - Joint angles, velocities, forces, and performance metrics
- **Normative comparisons** - Compare results against population distributions
- **Any movement activity** - Squats, jumps, walking, running, or custom movements

## Installation

### Swift Package Manager

Add the SDK to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/model-health/model-health.git", from: "1.0.0")
]
```

Or in Xcode:
1. File → Add Packages
2. Enter repository URL
3. Select version/branch

## Quick Start

```swift
import ModelHealth

let service = ModelHealthService()

// 1. Authenticate
let result = try await service.login(username: "user@example.com", password: "password")
if case .verificationRequired = result {
    try await service.verify(code: "123456", rememberDevice: true)
}

// 2. Create session and calibrate cameras
let session = try await service.createSession()
let checkerboard = CheckerboardDetails(
    rows: 4, 
    columns: 5, 
    squareSize: 35, 
    placement: .perpendicular
)
try await service.calibrateCamera(session, checkerboardDetails: checkerboard)

// 3. Capture neutral pose for model scaling
try await service.calibrateNeutralPose()

// 4. Record movement
try await service.recordTrial(named: "squat-baseline")
// Subject performs movement...
try await service.stopRecording(trialId: trialId)

// 5. Fetch analysis results
let csvData = try await service.fetchAnalysis(trialId: trialId)
```

## Workflow

The typical workflow follows these steps:

1. **Authentication** - Login with email/password, verify with email code if needed
2. **Session Setup** - Create a calibration session for your recording
3. **Camera Calibration** - Calibrate cameras using a printed checkerboard pattern
4. **Neutral Pose** - Capture subject standing in neutral position to scale the model
5. **Recording** - Record the movement activity (squats, jumps, etc.)
6. **Analysis** - Retrieve processed biomechanical data as CSV

Videos are automatically uploaded during recording and processed in the cloud. Results are typically available within minutes.

## Use Cases

### Sports Performance
- Jump height and power analysis
- Sprint mechanics
- Movement asymmetries
- Return-to-play assessments

### Physical Therapy
- Gait analysis
- Range of motion tracking
- Squat depth and form
- Progress monitoring

### Research
- Biomechanics studies
- Normative data collection
- Intervention effectiveness
- Longitudinal tracking

## Requirements

- iOS 15.0+
- Swift 5.7+
- Internet connection for cloud processing
- Printed checkerboard pattern for calibration (5×6 recommended)

## Documentation

- **[SDK Reference](docs/SDK_REFERENCE.md)** - Complete API documentation
- **[Architecture](docs/ARCHITECTURE.md)** - Internal design and cross-platform strategy
- **[Web Documentation](https://modelhealth.io/developer/)** - Interactive documentation

### Building Documentation

```bash
# Preview documentation locally
make docs-preview

# Generate for web hosting
make docs-export

# Generate markdown reference
make docs-markdown
```

## Support

- **Issues**: [GitHub Issues](https://github.com/model-health/model-health/issues)
- **Documentation**: [docs.modelhealth.com](https://docs.modelhealth.io)
- **Email**: support@modelhealth.com

## License

See LICENSE file for details

---

© 2025 ModelHealth. All rights reserved.
