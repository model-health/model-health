# Model Health Swift SDK — Examples

A collection of example scripts demonstrating the Model Health Swift SDK.

## Requirements

- macOS 14 or later
- Swift 5.9 or later (Xcode 15+)

Dependencies (`ModelHealth`, via the public `model-health-swift` package) are
resolved automatically by `swift run`/`swift build`.

## Configuration

API credentials can be stored in a `.env` file in this directory so you don't
have to pass them on the command line every time.

Create a file called `.env` (it is gitignored):

```
MODEL_HEALTH_API_KEY=your_model_health_api_key
```

Each script reads the API key in this order:
1. Command-line argument (if provided)
2. `.env` file in this directory
3. Environment variable (`MODEL_HEALTH_API_KEY`)

## Scripts

Each script is its own executable target, run via `swift run <Target>`.

### `ActivityAnalysis` — Post-capture analysis workflow

Walks through selecting a session and activity, running
an analysis and saving results (metrics JSON, report PDF, data ZIP).

```bash
swift run ActivityAnalysis [<api_key>]
```

### `ActivityMetrics` — Retrieve biomechanical metrics

Selects a session and activity, then fetches its metrics via
`activityMetrics` and prints them.

```bash
swift run ActivityMetrics [<api_key>]
```

### `ActivityRecording` — Full capture workflow

Walks through creating a session, calibrating cameras and subject, recording an
activity and waiting for processing. Cameras are calibrated once; you can then
switch between subjects in any order with `switchSubject(to:in:)`, and each subject
keeps a single session and does their neutral pose once. Requires cameras connected via the [Model
Health companion iOS app](https://apps.apple.com/nl/app/model-health/id6748835391).

```bash
swift run ActivityRecording [<api_key>]
```

### `AddExternalData` — Attach external files

Selects an activity and attaches one or more local files
to it using `addMotionData(_:to:)`.

```bash
swift run AddExternalData [<api_key>]
```

### `UpdateActivity` — Update activity metadata

Selects a subject and one of their activities, then optionally updates the
activity name and/or tags via `update(activity:config:)`.

```bash
swift run UpdateActivity [<api_key>]
```

### `FetchSubject` — Fetch a subject by ID

Selects a subject, then re-fetches it by ID via `fetch(subject:)` and prints
its details.

```bash
swift run FetchSubject [<api_key>]
```

### `ArchiveSession` — Session archive download

Requests preparation of a session archive and downloads the resulting ZIP file.

```bash
swift run ArchiveSession [<api_key>]
```

### `SessionData` — Download data from an existing session

Selects a session and activity interactively, then lets you download videos
(raw, synced), motion data (kinematics, markers) and analysis results
(metrics, report, data ZIP). Also downloads the OpenSim model from the
neutral activity if one is present in the session.

```bash
swift run SessionData [<api_key>]
```

### `VideoUploadMode` — Set video upload mode

Lets you pick and apply a video upload mode (enabled, disabled or flush)
for your account via `setVideoUploadMode`.

```bash
swift run VideoUploadMode [<api_key>]
```

### `ListActivities` — Browse activities

Shows what an activity list can be asked for: how many match, what the first
few look like, how each filter changes the count without reading anything, and
which activity comes first under each order.

```bash
swift run ListActivities [<api_key>]
```

### `ListSubjects` — Browse subjects

The same for subjects, with the filters a subject list takes.

```bash
swift run ListSubjects [<api_key>]
```

### `ListSessions` — Browse sessions

The same for sessions. Narrowing to one subject is the only filter a session
list takes.

```bash
swift run ListSessions [<api_key>]
```

### `ListGroups` — Browse subject groups

The same for subject groups. Search is the only filter a group list takes.

```bash
swift run ListGroups [<api_key>]
```

### `GetUsage` — Check account usage and plan state

Fetches the authenticated account's current billing/quota state via `usage`
and prints it, including whether recording is currently allowed.

```bash
swift run GetUsage [<api_key>]
```
