# Model Health TypeScript SDK — Examples

A collection of example scripts demonstrating the Model Health TypeScript SDK.


## Requirements

- Node.js 20 or later
- `npm install` (installs `@modelhealth/modelhealth`, `tsx` and `typescript`)

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

Each script can be run either via its `npm run` alias or directly with `tsx`,
e.g. `npm run fetch-subject` or `npx tsx fetch_subject.ts`.

### `activity_analysis.ts` — Post-capture analysis workflow

Walks through selecting a session and activity, running
an analysis and saving results (metrics JSON, report PDF, data ZIP).

```bash
npm run activity-analysis -- [<api_key>]
```

### `activity_metrics.ts` — Retrieve biomechanical metrics

Selects a session and activity, then fetches its metrics via
`activityMetrics` and prints them.

```bash
npm run activity-metrics -- [<api_key>]
```

### `activity_recording.ts` — Full capture workflow

Walks through creating a session, calibrating cameras and subject, recording an
activity and waiting for processing. Cameras are calibrated once; you can then
switch between subjects in any order with `switchSubject`, and each subject
keeps a single session and does their neutral pose once. Requires cameras connected via the [Model
Health companion iOS app](https://apps.apple.com/nl/app/model-health/id6748835391).

```bash
npm run activity-recording -- [<api_key>]
```

### `add_external_data.ts` — Attach external files

Selects an activity and attaches one or more local files
to it using `addMotionDataToActivity`.

```bash
npm run add-external-data -- [<api_key>]
```

### `update_activity.ts` — Update activity metadata

Selects a subject and one of their activities, then optionally updates the
activity name and/or tags via `updateActivity`.

```bash
npm run update-activity -- [<api_key>]
```

### `fetch_subject.ts` — Fetch a subject by ID

Selects a subject, then re-fetches it by ID via `fetchSubject` and prints
its details.

```bash
npm run fetch-subject -- [<api_key>]
```

### `archive_session.ts` — Session archive download

Requests preparation of a session archive and downloads the resulting ZIP file.

```bash
npm run archive-session -- [<api_key>]
```

### `session_data.ts` — Download data from an existing session

Selects a session and activity interactively, then lets you download videos
(raw, synced), motion data (kinematics, markers) and analysis results
(metrics, report, data ZIP). Also downloads the OpenSim model from the
neutral activity if one is present in the session.

```bash
npm run session-data -- [<api_key>]
```

### `video_upload_mode.ts` — Set video upload mode

Lets you pick and apply a video upload mode (enabled, disabled or flush)
for your account via `setVideoUploadMode`.

```bash
npm run video-upload-mode -- [<api_key>]
```

### `list_activities.ts` — Browse activities

Shows what an activity list can be asked for: how many match, what the first
few look like, how each filter changes the count without reading anything, and
which activity comes first under each order.

```bash
npm run list-activities -- [<api_key>]
```

### `list_subjects.ts` — Browse subjects

The same for subjects, with the filters a subject list takes.

```bash
npm run list-subjects -- [<api_key>]
```

### `list_sessions.ts` — Browse sessions

The same for sessions. Narrowing to one subject is the only filter a session
list takes.

```bash
npm run list-sessions -- [<api_key>]
```

### `list_groups.ts` — Browse subject groups

The same for subject groups. Search is the only filter a group list takes.

```bash
npm run list-groups -- [<api_key>]
```

### `get_usage.ts` — Check account usage and plan state

Fetches the authenticated account's current billing/quota state via `usage`
and prints it, including whether recording is currently allowed.

```bash
npm run get-usage -- [<api_key>]
```
