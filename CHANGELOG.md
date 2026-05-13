# Changelog

## 0.5.0

## Added

- `addMotionData(_:to:)` (Swift), `addMotionDataToActivity()` (TypeScript), `add_motion_data_to_activity()` (Python) — attach external files (CSV, JSON, binary) to an activity after recording. Accepts one or more `ExternalResultFile` values constructed via `.tagged()` factory method.
- `ExternalResultFile` type in all bindings, with `tagged` factory method.
- `ExternalDataFormat` enum (Swift) / format string (Python/TypeScript) for specifying the encoding of tagged files (`csv`, `json`, `binary`).

## Fixed

- Network requests now retry automatically on transient failures (server 5xx errors and connection-level errors).  Client errors (4xx) and authentication failures are not retried.

## 0.4.4

### Fixed: MOT file parsing issues

A MOT file with the following header failed CSV conversion

```
Coordinates
version=1
nRows=421
nColumns=40
inDegrees=yes

Units are S.I. units (second, meters, Newtons, ...)
If the header above contains a line with 'inDegrees', this indicates whether rotational values are in degrees (yes) or radians (no).

endheader
```

The MOT to CSV converter didn't handle the file title `Coordinates`, or the blank lines and free form description.

## 0.4.3

### Fixed: Calibration decoding for Swift and TypeScript

Both Swift and TypeScript failed to return valid calibration status values for camera and subject calibration.


## 0.4.2

### Fixed: SPM issues

`Package.swift` was missing supported iOS and macOS versions.

## 0.4.1

### Fixed: iOS example app had build issues

Added missing `ActivityStatus` to example in recording flow.
## 0.4.0

### Changed: Default Core Engine

In `SessionConfig` the default core engine is now 1.0.


## 0.3.0

### New: Python SDK

Python SDK is now available on PyPI:

```bash
pip install modelhealth
```


```python
from modelhealth import ModelHealthService

service = ModelHealthService(api_key="...")
sessions = service.list_sessions()
```

See the [Python documentation](https://sdk.modelhealth.io/getting-started/installation) for the full API reference.

---

### New: Session Import

Sessions can now be imported from a JSON activity export. The import workflow handles session creation, subject association, video transfer and processing for each activity and reports progress via a status callback.

Progress is delivered as `ImportStatus` values: `CreatingSession`, `CreatedSession`, `UploadingVideo` (with trial name and upload count) and `Processing`.

---

### New: Activity type for automatic analysis

`startRecording` now accepts an optional `ActivityConfig` containing an activity type. When provided, the corresponding analysis starts automatically once the recording is processed — no need to call `startAnalysis` separately.

**Swift**
```swift
let activity = try await service.startRecording(
    activityNamed: "cmj",
    in: session,
    config: ActivityConfig(activityType: .counterMovementJump)
)
```

**TypeScript**
```ts
const activity = await client.startRecording("cmj", session, {
    activityType: ActivityType.CounterMovementJump,
})
```

**Python**
```python
activity = service.start_recording(
    "cmj", session, ActivityConfig(ActivityType.counter_movement_jump)
)
```

---

### New: Archive Download

Sessions can now be exported as a ZIP archive containing all activity data and, optionally, raw video files.

**Swift**
```swift
let archive = try await service.prepareArchive(for: session, withVideos: false)
// poll until ready
let data = try await service.archiveData(for: archive)
```

**TypeScript**
```ts
const archive = await service.prepareArchive(session, false)
// poll until ready
const data = await service.archiveData(archive)
```

**Python**
```python
archive = service.prepare_archive(session, with_videos=False)
# poll until ready
data = service.archive_data(archive)
```

Use `archive_status` / `archiveStatus` to poll: the archive moves from `Processing` to `Ready` when the ZIP is available.

---

### New: Session configuration

Sessions can now be configured with capture settings before recording begins.

**Swift**
```swift
// All defaults
try await service.configure(session: session)

// Custom frame rate and data-sharing only
try await service.configure(session: session, config: SessionConfig(
    framerate: .fps60,
    dataSharing: .shareNoData
))
```

**TypeScript**
```ts
// All defaults
await service.configureSession(session, {})

// Custom frame rate and data-sharing only
await service.configureSession(session, {
    framerate: 60,
    dataSharing: "Share no data",
})
```

**Python**
```python
# All defaults
service.configure_session(session)

# Custom frame rate and data-sharing only
service.configure_session(
    session,
    framerate=SessionFramerate.fps_60,
    data_sharing=SessionDataSharing.share_no_data,
)
```

`create_session` / `createSession` now automatically applies a default configuration — call `configure_session` afterwards to override any settings.

---

### Breaking: `activitiesForSubject` now takes an integer ID instead of a string

Getting activities for a subject previously accepted a raw string ID and now requires an integer.

| SDK | Before | After |
|---|---|---|
| Swift | `activities(forSubject: "\(subject.id)")` | `activities(forSubject: subject.id)` |
| TypeScript | `activitiesForSubject("{subject.id}"")` | `activitiesForSubject(subject.id)` |

---

### Swift: SwiftUI preview support for `Archive`

`Archive` conforms to the protocols needed to use it in SwiftUI previews.

