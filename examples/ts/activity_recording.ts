/**
 * Model Health TypeScript SDK — capture workflow.
 * Mirrors examples/python/activity_recording.py.
 *
 * Usage:
 *   npx tsx activity_recording.ts [<api_key>]
 */

import { ModelHealthService, ActivityType } from '@modelhealth/modelhealth';
import type {
  CheckerboardDetails, CheckerboardPlacement,
  CalibrationStatus, ActivityStatus, Analysis,
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
  type: string | null;
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

async function pollActivity(
  service: ModelHealthService,
  activity: Parameters<typeof service.activityStatus>[0]
): Promise<ActivityStatus> {
  while (true) {
    const status = await service.activityStatus(activity);
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

async function main() {
  const args = process.argv.slice(2);
  console.log('Connecting...');
  const service = new ModelHealthService({ apiKey: loadApiKey(args[0]), autoInit: false });
  await service.init();

  // Session
  console.log('\nCreating session...');
  const session = await service.createSession();
  console.log(`  Session ID: ${session.id}`);

  if (!session.qrcode) {
    console.error('Session has no QR code — cannot pair cameras.');
    process.exit(1);
  }

  const qrRes = await fetch(session.qrcode);
  const qrData = new Uint8Array(await qrRes.arrayBuffer());
  const qrPath = saveFile('qr-code.png', qrData);
  console.log(`  QR code saved to: ${qrPath}`);
  console.log('  Pair your cameras using the Model Health companion iOS app before continuing.');

  await prompt('\nPress Enter when cameras are ready...');

  // Camera calibration
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

  const checkerboard: CheckerboardDetails = { rows, columns, squareSize, placement };

  await prompt('\nPress Enter to start camera calibration...');
  console.log('Calibrating cameras...');
  await service.calibrateCamera(session, checkerboard, calibrationCallback);
  console.log('Camera calibration complete.');

  // Subject
  console.log('\nFetching subjects...');
  const subjects = await service.subjectList();

  let subject;
  if (subjects.length > 0 && await confirm(`Found ${subjects.length} subject(s). Select an existing one?`, true)) {
    console.log();
    subject = await pickOne(subjects, 'Select subject', s => `${s.name}  (ID ${s.id})`);
    console.log(`  Using: ${subject.name}`);
  } else {
    console.log('\nNew subject details:');
    const name   = (await prompt('  Name: ')).trim() || 'Anonymous';
    const weight = parseFloat((await prompt('  Weight (kg): ')).trim());
    const height = parseFloat((await prompt('  Height (cm): ')).trim());
    console.log('Creating subject...');
    subject = await service.createSubject({ name, weight, height });
    console.log(`  Subject created: ${subject.name} (ID ${subject.id})`);
  }

  // Subject calibration
  await prompt(`\nAsk ${subject.name} to stand in the neutral pose, then press Enter...`);
  console.log('Calibrating subject...');
  await service.calibrateSubject(subject, session, calibrationCallback);
  console.log('Subject calibration complete.');

  // Recording
  const activityName = (await prompt('\nActivity name (e.g. cmj, squat): ')).trim() || 'activity';

  console.log('\nAutomatic analysis (optional):\n');
  const selected = await pickOne(ACTIVITY_TYPE_OPTIONS, 'Select activity type', t => t.label);
  const activityTypeValue = selected.type;
  const activityTypeLabel = selected.label;

  await prompt(`\nAsk ${subject.name} to get ready, then press Enter to start recording...`);
  console.log('Recording...');
  const config = activityTypeValue ? { activityType: activityTypeValue as any } : undefined;
  const activity = await service.startRecording(activityName, session, config);
  console.log(`  Recording started (activity ${activity.id}).`);

  await prompt('\nPress Enter when the movement is complete to stop recording...');
  console.log('Stopping recording...');
  await service.stopRecording(session);
  console.log('Recording stopped. Videos are uploading.');

  // Wait for processing
  console.log('\nWaiting for upload and processing...');
  const finalStatus = await pollActivity(service, activity);

  let currentActivity = activity;

  if (finalStatus.type === 'analyzing') {
    const task: Analysis = { taskId: finalStatus.taskId };
    console.log(`Activity is ready. Automatic '${activityTypeLabel}' analysis has started.`);
    console.log('\nWaiting for analysis to complete...');
    const resultStatus = await pollAnalysis(service, task);

    if (resultStatus.type !== 'completed') {
      console.error(`Analysis did not complete (status: ${resultStatus.type}).`);
      process.exit(1);
    }
    console.log('Analysis complete.');

    const freshActivity = await service.fetchActivity(activity.id);
    currentActivity = freshActivity;
    const results = await service.analysisDataForActivity(freshActivity, ['report']);
    const slug = (freshActivity.name ?? freshActivity.id).replace(/ /g, '_');

    console.log('\nDownloading report...');
    for (const r of results) {
      const ext = ANALYSIS_DATA_EXT[r.type] ?? 'bin';
      const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
      console.log(`  Saved ${p}`);
    }
  } else if (finalStatus.type === 'ready') {
    console.log(`Activity is ready. ID: ${activity.id}`);
    console.log('Run activity_analysis.ts to analyze this activity.');
  } else {
    console.error(`Activity did not reach ready state (status: ${finalStatus.type}).`);
    process.exit(1);
  }

  // Update activity metadata (optional)
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
      const updated = await service.updateActivity(currentActivity, { name: newName, addTags, removeTags });
      console.log(`  Updated: ${updated.name ?? updated.id}`);
    } catch (err: any) {
      console.error(`Failed to update activity: ${err.message ?? err}`);
    }
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
