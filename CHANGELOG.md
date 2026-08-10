# Changelog

## 0.9.1

### Changed

- The API reference for all three bindings now refers to `ModelHealthClient` rather than the deprecated `ModelHealthService`, including code examples and the Python `UnsupportedOperationError` description.

### Fixed

- Swift: the 0.9.x line is now installable via SwiftPM. 0.9.0 shipped to npm and PyPI but was never tagged in the Swift package repository, so `from: "0.9.0"` could not resolve — it now resolves to 0.9.1.

## 0.9.0

### Added

- `ModelHealthClient` — the new entrypoint for the SDK, available in all three bindings (Swift, TypeScript, Python), replacing `ModelHealthService`. Takes your API key as a required argument, and adds configurable `timeout` and `maxRetries`/`max_retries` options (previously not honored).

- `accountInfo()` / `account_info()` — returns identity and licensing information for the authenticated account.

- `AccountInfo` — new model type with `username`, `email`, `firstName`/`first_name`, `lastName`/`last_name`, `institution`, `profession`, `country`.

### Changed

- `ModelHealthService` is now deprecated in favor of `ModelHealthClient` (all three bindings). It continues to work unchanged but emits a deprecation warning on construction (Python `DeprecationWarning`, TypeScript `console.warn`, Swift compiler warning via `@available(*, deprecated, renamed:)`).

- `timeout` applies to regular API calls only; archive downloads and video uploads are not bounded by it. It is not enforced on the web (WebAssembly).

### Fixed

- Python: creating more than one client in the same process no longer causes the second client's first request to hang until it times out.

## 0.8.0

### New UI visualization modules

You can now add 3D visualization of an activity to your own apps. 

- `@modelhealth/viewer-react` — a new npm package providing `View3D`, an embeddable React Three Fiber component that renders an activity as a 3D view, with playback driven through an imperative handle (`play`/`pause`/`seek`/`step`/`setPlaybackSpeed`) rather than built-in controls, so consumers can build their own UI around it.

- `ModelHealthUI` — a new Swift target/product providing `View3D`/`View3DController`, a WKWebView-based wrapper for the 3D view for iOS/macOS apps. Depends on `ModelHealth`; import it separately (`import ModelHealthUI`) so apps that don't need the 3D view don't pay for WebKit/SwiftUI. Supports each of the `play`/`pause`/`seek`/`step`/`setPlaybackSpeed` that the TypeScript viewer supports.

### Added

- `setVideoUploadMode(_:)` / `setVideoUploadMode(mode)` / `set_video_upload_mode(mode)` — sets the video upload mode, controlling whether connected devices upload recorded video.

- `VideoUploadMode` — a new enum with `enabled`, `disabled`, and `flush` values, passed to `setVideoUploadMode`. `flush` re-enables uploads and uploads any videos that were queued locally on the iOS device while upload was disabled.

- `newSession(from:)` / `newSessionFromSession(session)` / `new_session_from_session(session)` — creates a new session from a previous session, inheriting its calibration setup, so a new subject can be calibrated without repeating checkerboard calibration.

## 0.7.0

### Added:
- `created_at` and `updated_at` fields to `Session` and `Activity` types 

## 0.6.0

## Added

- `ActivityType.sprint`, `ActivityType.lateralStepdown`, `ActivityType.lunge` — three new activity types available for analysis in all language bindings.
- `RecordingConfig` — a new type with optional `framerate` and `filterFrequency` fields that override the session-level defaults for a specific recording. Available in all language bindings.
- `ActivityConfig.config: RecordingConfig?` — pass a `RecordingConfig` when starting a recording to apply per-recording settings. Omitting it (or passing `nil`/`null`/`None`) falls back to the session's configured values.
- `ActivityConfig.addTags` / `ActivityConfig.removeTags` (Swift/TypeScript) and `ActivityConfig.add_tags` / `ActivityConfig.remove_tags` (Python) — pass tags to add or remove on a recording. Existing tags are preserved; only the specified tags are added or removed. Pass both at once to add and remove in a single call.
- `ActivityConfig.activityType` is now optional (previously required). This allows `ActivityConfig` to be used for update-only operations (e.g. modifying tags) without specifying an activity type.
- `update(activity:config:)` / `updateActivity(activity, config)` — all supported languages now accept an optional `ActivityConfig` alongside the activity, enabling tag updates in the same call.
- `activityMetrics(for:)` / `activityMetrics(activityId)` / `activity_metrics(activity_id)` — fetches the dashboard metric groups for a single activity. Returns an `ActivityMetrics` value containing `MetricsGroup` entries, each holding `Metric` values with scalar or bilateral readings.
- `subjectMetrics(forSubject:start:end:)` / `subjectMetrics(subjectId, start?, end?)` / `subject_metrics(subject_id, start, end)` — fetches metrics across all activities for a subject, with optional ISO 8601 date-range filtering. Swift accepts `Date?`; TypeScript and Python accept ISO date strings.
- `ActivityMetrics`, `MetricsGroup`, `Metric`, `MetricValue` — new model types backing the metrics APIs. `MetricValue` is a scalar (`value: Double?`) or bilateral (`left: Double?`, `right: Double?`) reading.
- The SDK now includes example scripts for Swift and TypeScript.


## Fixed

- TypeScript: `calibrateCamera` and `calibrateSubject` now invoke the `statusCallback` argument with live status updates. Previously the callback was accepted but never called.
- TypeScript: WASM initialisation now works correctly in Node.js. The SDK previously failed to load in Node environments due to `fetch` not supporting `file://` URLs.
- TypeScript: `analysisDataForActivity` and `motionDataForActivity` now return `data` as `Uint8Array` as documented. Previously the bytes were returned as a plain `Array`, causing errors when writing results to disk.

## 0.5.1

## Fixed

Minor documentation updates.

## 0.5.0

## Added

- `addMotionData(_:to:)` (Swift), `addMotionDataToActivity()` (TypeScript), `add_motion_data_to_activity()` (Python) — attach external files (CSV, JSON, binary) to an activity after recording. Accepts one or more `ExternalResultFile` values.
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

