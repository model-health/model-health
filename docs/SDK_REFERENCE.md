# ModelHealth SDK Reference

Complete API reference for the ModelHealth iOS SDK.

---


## ModelHealthService
*Class*

The primary interface for ModelHealth's movement analysis platform.

ModelHealthService enables you to measure and analyze human movement from smartphone
videos. It provides a complete workflow for:
- Authentication and session management
- Multi-camera calibration
- Movement data collection
- Analysis and reporting

## Overview

The SDK follows a structured workflow:

1. **Authentication**: Login with credentials, verify with email code if needed
2. **Session Creation**: Create a calibration session
3. **Camera Calibration**: Calibrate cameras using a checkerboard pattern
4. **Neutral Pose**: Capture subject's neutral standing pose for scaling
5. **Recording**: Record movement trials (squats, jumps, etc.)
6. **Analysis**: Fetch processed biomechanical data

## Usage Example

```swift
let service = ModelHealthService()

// Authenticate
let loginResult = try await service.login(username: "user@example.com", password: "pass")
if case .verificationRequired = loginResult {
    try await service.verify(code: "123456", rememberDevice: true)
}

// Create session and calibrate
let session = try await service.createSession()
let details = CheckerboardDetails(rows: 4, columns: 5, squareSize: 35, placement: .perpendicular)
try await service.calibrateCamera(session, checkerboardDetails: details) { status in }

// Capture neutral pose
try await service.calibrateNeutralPose(for: subject, in: session) { status in }

// Record a movement trial
let trial = try await service.record(trialNamed: "cmj-1", in: session)
// Subject performs movement...
try await service.stopRecording(session)

// Poll for processing completion, then analyze
let status = try await service.getStatus(forTrial: trial)
if case .ready = status {
    let task = try await service.startAnalysis(.counterMovementJump, for: trial, in: session)
    // Poll for analysis completion...
}
```

## Topics

### Authentication
- ``login(username:password:)``
- ``verify(code:rememberDevice:)``

### Data Retrieval
- ``subjectList()``
- ``trialList()``
- ``videoList()``

### Session & Calibration
- ``createSession()``
- ``calibrateCamera(_:checkerboardDetails:)``
- ``calibrateNeutralPose(for:in:)``

### Recording & Analysis
- ``record(trialNamed:in:)``
- ``stopRecording(_:)``
- ``getStatus(forTrial:)``
- ``startAnalysis(_:for:in:)``
- ``getAnalysisStatus(for:)``
- ``downloadAnalysisResult(forTrial:resultTag:)``

## Special Note for SwiftUI Previews

Helpers are provided to populate Previews in SwiftUI, These are only available in DEBUG
builds. You will need to wrap your previews:
```swift
#if DEBUG
#Preview {
MyView(session: .forPreview())
}
#endif
```

### login

`login(username: String, password: String)` `async` `throws` → `LoginResult`

Authenticates a user with username and password.

This initiates the login process. Depending on the account's security settings
and device trust status, either:
- Returns ``LoginResult/ok`` if the device is trusted (previously verified with
`rememberDevice: true` within the last 90 days)
- Returns ``LoginResult/verificationRequired`` if email verification is needed

When verification is required, a code is automatically sent to the user's
registered email address. Complete authentication by calling ``verify(code:rememberDevice:)``.

```swift
let result = try await service.login(username: "user@example.com", password: "secure_pass")

switch result {
    case .ok:
        // Authentication complete, proceed with SDK usage
        print("Login successful")

    case .verificationRequired:
        // Prompt user for email verification code
        let code = await promptUserForCode()
        try await service.verify(code: code, rememberDevice: true)
}
```

- Parameters:
- username: User's email address
- password: User's password
- Returns: A ``LoginResult`` indicating whether verification is required
- Throws: An error if authentication fails (invalid credentials, network issues, etc.)

### verify

`verify(code: String, rememberDevice: Bool = false)` `async` `throws`

Completes authentication by verifying an email code.

After ``login(username:password:)`` returns ``LoginResult/verificationRequired``,
call this method with the verification code sent to the user's email.

Set `rememberDevice: true` to skip email verification on this device for 90 days.
Future login attempts from this device will return ``LoginResult/ok`` directly.

```swift
// After receiving .verificationRequired from login
try await service.verify(code: "123456", rememberDevice: true)
// Authentication now complete, SDK ready for use
```

- Parameters:
- code: 6-digit verification code from email
- rememberDevice: If `true`, trust this device for 90 days (default: `false`)
- Throws: An error if the code is invalid or expired

### subjectList

`subjectList()` `async` `throws` → `[Subject]`

Retrieves all subjects associated with the authenticated account.

Subjects represent individuals being monitored or assessed. Each subject
contains demographic information, physical measurements, and categorization tags.

```swift
let subjects = try await service.subjectList()
for subject in subjects {
    print("\(subject.name): \(subject.height ?? 0)cm, \(subject.weight ?? 0)kg")
}

// Filter by tags
let athletes = subjects.filter { $0.subjectTags.contains("athlete") }
```

- Returns: An array of ``Subject`` objects
- Throws: An error if the request fails or authentication has expired

### trialList

`trialList()` `async` `throws` → `[Trial]`

Retrieves all movement trials associated with the authenticated account.

Trials represent individual recording sessions and contain references to
captured videos and analysis results. Use this to review past data or
fetch analysis for completed trials.

```swift
let trials = try await service.trialList()

// Find completed trials ready for analysis
let completed = trials.filter { $0.status == "completed" }

// Access videos and results
for trial in completed {
    print("Trial: \(trial.name ?? trial.id)")
    print("Videos: \(trial.videos.count)")
    print("Results: \(trial.results.count)")
}
```

- Returns: An array of ``Trial`` objects
- Throws: An error if the request fails or authentication has expired

### videoList

`videoList()` `async` `throws` → `[Video]`

Retrieves all videos associated with the authenticated account.

Videos are organized by trial and device. Each video includes metadata
such as timestamps, processing status, and download URLs.

```swift
let videos = try await service.videoList()

// Group by trial
let videosByTrial = Dictionary(grouping: videos) { $0.trial }

// Download a specific video
if let videoUrl = videos.first?.videoUrl {
    // Use videoUrl to download the video file
}
```

- Returns: An array of ``Video`` objects
- Throws: An error if the request fails or authentication has expired

### createSession

`createSession()` `async` `throws` → `Session`

Creates a new calibration session.

A session is required before performing camera calibration. It represents
a single calibration workflow and groups multiple cameras together.

After creating a session, use ``calibrateCamera(_:checkerboardDetails:)``
to calibrate your cameras.

```swift
// Create session
let session = try await service.createSession()

// Proceed with calibration
let details = CheckerboardDetails(
    rows: 4,
    columns: 5,
    squareSize: 35,
    placement: .perpendicular
)
try await service.calibrateCamera(session, checkerboardDetails: details)
```

- Returns: A ``Session`` object with a unique identifier
- Throws: An error if session creation fails

### record

`record(trialNamed name: String, in session: Session)` `async` `throws` → `Trial`

Starts recording a movement trial.

After completing calibration steps (camera calibration and neutral pose),
use this method to begin recording an activity.

Videos are automatically uploaded to the cloud for processing. Multiple
cameras can record simultaneously if configured.

**Important:** Call ``stopRecording(session:)`` when the movement is complete
to finalize the trial and trigger video upload.

```swift
// Record a CMJ session
let trial = try await service.record(trialNamed: "cmj-2024", in: session)
// Subject performs CMJ while cameras record

// When complete, stop recording
try await service.stopRecording(session: session)
```

- Parameters:
- trialName: A descriptive name for this trial (e.g., "cmj-test")
- session: The session this trial is  associated with
- Throws: An error if recording cannot start (session not calibrated, camera issues, etc.)

### stopRecording

`stopRecording(_ session: Session)` `async` `throws`

Stops recording of a movement trial in a session.

Call this method when the subject has completed the movement activity.
Recorded videos are finalized and uploaded to the cloud for biomechanical
analysis.

```swift
// After recording is complete
try await service.stopRecording(session: Session)
```

- Parameter session: The session to stop recording in
- Throws: An error if the trial cannot be stopped (invalid ID, already stopped, etc.)

### getStatus

`getStatus(forTrial trial: Trial)` `async` `throws` → `ActivityProcessingStatus`

Retrieves the current processing status of a trial.

Poll this method to determine when a trial is ready for analysis.
Trials must complete video upload and processing before analysis can begin.

- Parameter trial: A completed trial
- Returns: The current processing status
- Throws: Network or authentication errors

## Usage
```swift
let status = try await service.getStatus(forTrial: trial)

switch status {
case .ready:
print("Trial ready for analysis")
case .processing:
print("Still processing...")
case .uploading(let uploaded, let total):
print("Uploaded \(uploaded)/\(total) videos")
case .failed:
print("Processing failed")
}
```

### getAnalysisStatus

`getAnalysisStatus(for task: AnalysisTask)` `async` `throws` → `AnalysisTaskStatus`

Retrieves the current status of an analysis task.

Poll this method to monitor analysis progress. When status is `.completed`,
use the returned result tags to download analysis files.

- Parameter task: The task returned from `startAnalysis`
- Returns: The current analysis status
- Throws: Network or authentication errors

## Usage
```swift
let status = try await service.getAnalysisStatus(for: task)

switch status {
    case .processing:
        print("Analysis running...")
    case .completed(let tags):
        for tag in tags {
            let data = try await service.downloadAnalysisResult(
                forTrial: trial,
                resultTag: tag
            )
        }
    case .failed:
        print("Analysis failed")
}
```

## ModelHealthError
*Enum*

Errors that may be thrown by ModelHealthService

## CalibrationError
*Enum*

Errors specific to camera or neutral pose calibration

## Session
*Struct*

A calibration session for grouping camera calibration workflows.

Create with ``ModelHealthService/createSession()`` before performing camera calibration.

```swift
let session = try await service.createSession()
try await service.calibrateCamera(session, checkerboardDetails: details)
```

## Subject
*Struct*

An individual being monitored or assessed in the ModelHealth system.

```swift
let subjects = try await service.subjectList()
let filtered = subjects.filter { $0.subjectTags.contains("high-risk") }
```

## Video
*Struct*

A recorded video file from a trial.

Videos are automatically uploaded to the cloud during recording.
Use `video` to download the full video or `videoThumb` for preview thumbnails.

## Trial
*Struct*

A movement recording session with associated videos and analysis results.

Trials track the complete lifecycle of a recording from capture through
processing to final analysis.

```swift
let trials = try await service.trialList()
let completed = trials.filter { $0.status == "completed" && !$0.trashed }
```

## CheckerboardPlacement
*Enum*

Orientation of the calibration checkerboard relative to the camera.

```swift
let details = CheckerboardDetails(
rows: 4, columns: 5, squareSize: 35, placement: .perpendicular
)
```

## CheckerboardDetails
*Struct*

Configuration for a calibration checkerboard pattern.

**Important:** Row and column counts refer to internal corners, not squares.
For a standard 5×6 checkerboard, use `rows: 4, columns: 5`.
Square size must be measured precisely in millimeters for accurate calibration.

```swift
let details = CheckerboardDetails(
rows: 4,
columns: 5,
squareSize: 35,
placement: .perpendicular
)
try await service.calibrateCamera(session, checkerboardDetails: details)
```

## LoginResult
*Enum*

The result of a login attempt.

Indicates whether additional email verification is required to complete authentication.

```swift
let result = try await service.login(username: "user@example.com", password: "pass")

if case .verificationRequired = result {
    let code = await promptForVerificationCode()
    try await service.verify(code: code, rememberDevice: true)
}
```

## CalibrationStatus
*Enum*

Represents the current status of a calibration process.

This enum tracks the progression of either camera calibration or neutral pose calibration,
providing real-time feedback on the recording, upload, and processing stages.

## Usage
```swift
try await service.calibrateNeutralPose(
        for: subject,
        in: session
    ) { status in
        switch status {
        case .recording:
            print("Recording...")

        case .uploading(let uploaded, let total):
            print("Uploading: \(uploaded)/\(total)")

        case .processing(let percent):
            print("Processing: \(percent ?? 0)%")

        case .done(let images):
            print("Complete! \(images.count) videos processed")
        }
    }
```

## AnalysisType
*Enum*

Represents available analysis functions for motion capture data.

Each analysis type processes trial data to extract specific biomechanical metrics
and insights. Analysis can only be performed on trials that have completed processing.

## ActivityProcessingStatus
*Enum*

Represents the current processing state of a trial.

Trials must reach the `ready` state before analysis can be performed.

## AnalysisTask
*Struct*

Represents an active analysis task.

Use the `taskId` to poll for analysis completion status.

## AnalysisTaskStatus
*Enum*

Represents the current state of an analysis task.
