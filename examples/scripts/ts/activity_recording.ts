/**
 * Model Health TypeScript SDK — capture workflow.
 * Mirrors examples/python/activity_recording.py.
 *
 * Usage:
 *   npx tsx activity_recording.ts [<api_key>]
 */

import { ModelHealthClient, ActivityType } from '@modelhealth/modelhealth';
import type {
  CheckerboardDetails, CheckerboardPlacement,
  CalibrationStatus, ActivityStatus, Analysis, RecordingConfig,
} from '@modelhealth/modelhealth';
import {
  loadApiKey, ANALYSIS_DATA_EXT,
  pickOne, confirm, prompt, saveFile, pollAnalysis, sleep, closePrompts,
} from './_shared.js';

const CB_WIDTH = 48;

function calibrationCallback(status: CalibrationStatus): void {
  let msg: string;
  switch (status.type) {
    case 'recording':
      msg = '  Recording...';
      break;
    case 'uploading':
      msg = `  Uploading (${status.uploaded}/${status.total} cameras)...`;
      break;
    case 'processing': {
      const pct = status.percent != null ? `${status.percent}%` : '--%';
      msg = `  Processing (${pct})...`;
      break;
    }
    case 'done':
      process.stdout.write('  Done.'.padEnd(CB_WIDTH) + '\n');
      return;
  }
  process.stdout.write(msg.padEnd(CB_WIDTH) + '\r');
}

interface CheckerboardPreset {
  rows: number | null;
  columns: number | null;
  squareSize: number | null;
  label: string;
}

const CHECKERBOARD_PRESETS: CheckerboardPreset[] = [
  { rows: 4, columns: 5, squareSize: 35, label: '4 × 5  —  35 mm squares  (standard A4)' },
  { rows: 4, columns: 5, squareSize: 50, label: '4 × 5  —  50 mm squares  (large A3)' },
  { rows: null, columns: null, squareSize: null, label: 'Other — enter manually' },
];

interface ActivityTypeOption {
  type: ActivityType | null;
  label: string;
}

const ACTIVITY_TYPE_OPTIONS: ActivityTypeOption[] = [
  { type: null,                               label: 'None — skip automatic analysis'  },
  { type: ActivityType.CounterMovementJump,   label: 'Counter Movement Jump'           },
  { type: ActivityType.Gait,                  label: 'Overground Walking'              },
  { type: ActivityType.TreadmillGait,         label: 'Treadmill Walking'               },
  { type: ActivityType.TreadmillRunning,      label: 'Treadmill Running'               },
  { type: ActivityType.OvergroundRunning,     label: 'Overground Running'              },
  { type: ActivityType.SitToStand,            label: 'Sit-to-Stand Transfer'           },
  { type: ActivityType.Squats,                label: 'Squats'                          },
  { type: ActivityType.RangeOfMotion,         label: 'Range of Motion'                 },
  { type: ActivityType.DropJump,              label: 'Drop Vertical Jump'              },
  { type: ActivityType.Hop,                   label: 'Hop Test'                        },
  { type: ActivityType.ChangeOfDirection,     label: '5-0-5 Test'                      },
  { type: ActivityType.Cut,                   label: 'Cutting Maneuver'                },
  { type: ActivityType.Sprint,                label: 'Sprint'                          },
  { type: ActivityType.LateralStepdown,       label: 'Lateral Step Down'               },
  { type: ActivityType.Lunge,                 label: 'Lunge'                           },
];

interface FramerateOption {
  value: number | null;
  label: string;
}

const FRAMERATE_OPTIONS: FramerateOption[] = [
  { value: null, label: 'Default'  },
  { value: 60,   label: '60 fps'  },
  { value: 120,  label: '120 fps' },
  { value: 240,  label: '240 fps' },
];

interface FilterFrequencyOption {
  value: { type: 'hz'; value: number } | null;
  label: string;
}

const FILTER_FREQUENCY_OPTIONS: FilterFrequencyOption[] = [
  { value: null,                       label: 'Default' },
  { value: { type: 'hz', value: 6 },   label: '6 Hz'    },
  { value: { type: 'hz', value: 10 },  label: '10 Hz'   },
  { value: { type: 'hz', value: 20 },  label: '20 Hz'   },
];

async function pollActivity(
  client: ModelHealthClient,
  activity: Parameters<typeof client.activityStatus>[0]
): Promise<ActivityStatus> {
  while (true) {
    const status = await client.activityStatus(activity);
    if (status.type === 'uploading') {
      process.stdout.write(`  Uploading (${status.uploaded}/${status.total} cameras)...  \r`);
    } else if (status.type === 'processing') {
      process.stdout.write('  Processing...                              \r');
    } else {
      process.stdout.write('\n');
      return status;
    }
    await sleep(5_000);
  }
}

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

async function createSessionAndSaveQrCode(client: ModelHealthClient) {
  console.log('\nCreating session...');
  const session = await client.createSession();
  console.log(`  Session ID: ${session.id}`);

  if (!session.qrcode) {
    console.error('Session has no QR code — cannot pair cameras.');
    process.exit(1);
  }

  const qrRes = await fetch(session.qrcode);
  const qrData = new Uint8Array(await qrRes.arrayBuffer());
  const qrPath = saveFile('qr-code.png', qrData);
  console.log(`  QR code saved to: ${qrPath}`);

  return session;
}

async function waitForCameraPairing() {
  console.log('  Pair your cameras using the Model Health companion iOS app before continuing.');
  await prompt('\nPress Enter when cameras are ready...');
}

async function configureCheckerboard(): Promise<CheckerboardDetails> {
  console.log('\nCheckerboard configuration:\n');
  const preset = await pickOne(CHECKERBOARD_PRESETS, 'Select checkerboard', p => p.label);

  let rows: number;
  let columns: number;
  let squareSize: number;

  if (preset.rows !== null && preset.columns !== null && preset.squareSize !== null) {
    rows = preset.rows;
    columns = preset.columns;
    squareSize = preset.squareSize;
  } else {
    rows      = parseInt((await prompt('  Internal rows: ')).trim(), 10);
    columns   = parseInt((await prompt('  Internal columns: ')).trim(), 10);
    squareSize = parseInt((await prompt('  Square size (mm): ')).trim(), 10);
  }

  console.log('\nCheckerboard placement:\n');
  const placement = await pickOne<CheckerboardPlacement>(
    ['perpendicular', 'parallel'],
    'Select placement',
    p => p === 'perpendicular' ? 'Perpendicular (upright, facing cameras)' : 'Parallel (flat on the floor)'
  );

  return { rows, columns, squareSize, placement };
}

async function calibrateCameras(
  client: ModelHealthClient,
  session: Awaited<ReturnType<typeof createSessionAndSaveQrCode>>,
  checkerboard: CheckerboardDetails
) {
  await prompt('\nPress Enter to start camera calibration...');
  console.log('Calibrating cameras...');
  await client.calibrateCamera(session, checkerboard, calibrationCallback);
  console.log('Camera calibration complete.');
}

async function pickOrCreateSubject(client: ModelHealthClient) {
  console.log('\nFetching subjects...');
  const subjects = await client.subjectList();

  if (subjects.length > 0 && await confirm(`Found ${subjects.length} subject(s). Select an existing one?`, true)) {
    console.log();
    const subject = await pickOne(subjects, 'Select subject', s => `${s.name}  (ID ${s.id})`);
    console.log(`  Using: ${subject.name}`);
    return subject;
  }

  console.log('\nNew subject details:');
  const name   = (await prompt('  Name: ')).trim() || 'Anonymous';
  const weight = parseFloat((await prompt('  Weight (kg): ')).trim());
  const height = parseFloat((await prompt('  Height (cm): ')).trim());
  console.log('Creating subject...');
  const subject = await client.createSubject({ name, weight, height });
  console.log(`  Subject created: ${subject.name} (ID ${subject.id})`);
  return subject;
}

async function calibrateSubject(
  client: ModelHealthClient,
  subject: Awaited<ReturnType<typeof pickOrCreateSubject>>,
  session: Awaited<ReturnType<typeof createSessionAndSaveQrCode>>
) {
  await prompt(`\nAsk ${subject.name} to stand in the neutral pose, then press Enter...`);
  console.log('Calibrating subject...');
  await client.calibrateSubject(subject, session, calibrationCallback);
  console.log('Subject calibration complete.');
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));

  let session = await createSessionAndSaveQrCode(client);
  await waitForCameraPairing();

  const checkerboard = await configureCheckerboard();
  await calibrateCameras(client, session, checkerboard);

  for (;;) {
    const subject = await pickOrCreateSubject(client);
    await calibrateSubject(client, subject, session);

    // Recording loop
    do {
      await recordOne(client, session, subject);
    } while (await confirm('\nRecord another activity?', true));

    if (!(await confirm('\nCalibrate another subject with the same camera setup?', true))) {
      break;
    }
    session = await client.newSessionFromSession(session);
  }

  console.log('\nDone.');
}

async function promptRecordingSetup() {
  const activityName = (await prompt('\nActivity name (e.g. cmj, squat): ')).trim() || 'activity';

  console.log('\nAutomatic analysis (optional):\n');
  const selectedType = await pickOne(ACTIVITY_TYPE_OPTIONS, 'Select activity type', t => t.label);

  console.log('\nFramerate override (optional):\n');
  const selectedFramerate = await pickOne(FRAMERATE_OPTIONS, 'Select framerate', o => o.label);

  console.log('\nFilter frequency override (optional):\n');
  const selectedFilter = await pickOne(FILTER_FREQUENCY_OPTIONS, 'Select filter frequency', o => o.label);

  let recordingConfig: RecordingConfig | undefined;
  if (selectedFramerate.value !== null || selectedFilter.value !== null) {
    recordingConfig = {};
    if (selectedFramerate.value !== null) recordingConfig.framerate = selectedFramerate.value as any;
    if (selectedFilter.value !== null) recordingConfig.filterFrequency = selectedFilter.value;
  }
  const config = (selectedType.type || recordingConfig)
    ? { activityType: selectedType.type ?? undefined, config: recordingConfig }
    : undefined;

  return { activityName, selectedType, config };
}

async function startRecording(
  client: ModelHealthClient,
  session: Parameters<typeof client.startRecording>[1],
  subject: { name: string },
  activityName: string,
  config: Parameters<typeof client.startRecording>[2]
) {
  await prompt(`\nAsk ${subject.name} to get ready, then press Enter to start recording...`);
  console.log('Recording...');
  try {
    const activity = await client.startRecording(activityName, session, config);
    console.log(`  Recording started (activity ${activity.id}).`);
    return activity;
  } catch (err: any) {
    console.error(`Failed to start recording: ${err.message ?? err}`);
    return undefined;
  }
}

async function stopRecording(client: ModelHealthClient, session: Parameters<typeof client.stopRecording>[0]) {
  await prompt('\nPress Enter when the movement is complete to stop recording...');
  console.log('Stopping recording...');
  try {
    await client.stopRecording(session);
  } catch (err: any) {
    console.error(`Failed to stop recording: ${err.message ?? err}`);
    return false;
  }
  console.log('Recording stopped. Videos are uploading.');
  return true;
}

/**
 * Waits for upload/processing and, if automatic analysis was requested,
 * waits for it to complete and downloads the report. Always returns the
 * activity (fresh, if analysis ran and completed).
 */
async function waitAndProcessResults(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof client.startRecording>>,
  activityTypeLabel: string
) {
  console.log('\nWaiting for upload and processing...');
  const finalStatus = await pollActivity(client, activity);

  if (finalStatus.type === 'analyzing') {
    const task: Analysis = { taskId: finalStatus.taskId };
    return waitForAnalysisAndDownloadReport(client, activity, task, activityTypeLabel);
  } else if (finalStatus.type === 'ready') {
    console.log(`Activity is ready. ID: ${activity.id}`);
    console.log('Run activity_analysis.ts to analyze this activity.');
    return activity;
  } else {
    console.log(`Activity did not reach ready state (status: ${finalStatus.type}).`);
    return activity;
  }
}

async function waitForAnalysisAndDownloadReport(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof client.startRecording>>,
  task: Analysis,
  activityTypeLabel: string
) {
  console.log(`Activity is ready. Automatic '${activityTypeLabel}' analysis has started.`);
  console.log('\nWaiting for analysis to complete...');
  const resultStatus = await pollAnalysis(client, task);

  if (resultStatus.type !== 'completed') {
    console.log(`Analysis did not complete (status: ${resultStatus.type}).`);
    return activity;
  }

  console.log('Analysis complete.');
  const freshActivity = await client.fetchActivity(activity.id);
  const results = await client.analysisDataForActivity(freshActivity, ['report']);
  const slug = (freshActivity.name ?? freshActivity.id).replace(/ /g, '_');

  console.log('\nDownloading report...');
  for (const r of results) {
    const ext = ANALYSIS_DATA_EXT[r.type] ?? 'bin';
    const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
    console.log(`  Saved ${p}`);
  }

  return freshActivity;
}

// Re-fetch first: analysis auto-generates tags server-side, and updateActivity
// merges add/remove tags on top of the local activity's tags. Without a fresh
// fetch, the merge starts from a stale tag set and wipes the auto-generated tags.
async function updateActivityMetadata(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof waitAndProcessResults>>
) {
  let currentActivity = activity;
  try {
    currentActivity = await client.fetchActivity(activity.id);
  } catch (err: any) {
    console.error(`Failed to refresh activity: ${err.message ?? err}`);
  }

  console.log('\nUpdate activity (optional):');
  const currentTags = currentActivity.tags?.length ? currentActivity.tags.join(', ') : '(none)';
  console.log(`  Current tags: ${currentTags}`);
  const newName = (await prompt(`  New name (press Enter to keep '${currentActivity.name ?? currentActivity.id}'): `)).trim() || undefined;
  const addInput = (await prompt('  Tags to add, comma-separated (press Enter to skip): ')).trim();
  const addTags = addInput ? addInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  const removeInput = (await prompt('  Tags to remove, comma-separated (press Enter to skip): ')).trim();
  const removeTags = removeInput ? removeInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  if (newName || addTags.length || removeTags.length) {
    console.log('Updating activity...');
    try {
      const updated = await client.updateActivity(currentActivity, { name: newName, addTags, removeTags });
      console.log(`  Updated: ${updated.name ?? updated.id}`);
    } catch (err: any) {
      console.error(`Failed to update activity: ${err.message ?? err}`);
    }
  }
}

async function recordOne(
  client: ModelHealthClient,
  session: Parameters<typeof client.startRecording>[1],
  subject: { name: string }
): Promise<void> {
  const { activityName, selectedType, config } = await promptRecordingSetup();

  const activity = await startRecording(client, session, subject, activityName, config);
  if (!activity) return;

  if (!(await stopRecording(client, session))) return;

  const currentActivity = await waitAndProcessResults(client, activity, selectedType.label);
  await updateActivityMetadata(client, currentActivity);
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
