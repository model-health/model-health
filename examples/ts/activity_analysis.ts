/**
 * Model Health TypeScript SDK — post-capture analysis workflow.
 * Mirrors examples/python/activity_analysis.py.
 *
 * Usage:
 *   npx tsx activity_analysis.ts [<api_key>]
 */

import { ModelHealthService, ActivityType } from '@modelhealth/modelhealth';
import type { AnalysisDataType } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES, ANALYSIS_DATA_EXT,
  pickOne, pickMulti, saveFile, pollAnalysis, sleep, closePrompts,
} from './_shared.js';

const ANALYSIS_TYPES: [string, string][] = [
  [ActivityType.CounterMovementJump, 'Counter Movement Jump'],
  [ActivityType.Gait,                'Overground Walking'],
  [ActivityType.TreadmillGait,       'Treadmill Walking'],
  [ActivityType.TreadmillRunning,    'Treadmill Running'],
  [ActivityType.OvergroundRunning,   'Overground Running'],
  [ActivityType.SitToStand,          'Sit-to-Stand Transfer'],
  [ActivityType.Squats,              'Squats'],
  [ActivityType.RangeOfMotion,       'Range of Motion'],
  [ActivityType.DropJump,            'Drop Vertical Jump'],
  [ActivityType.Hop,                 'Hop Test'],
  [ActivityType.ChangeOfDirection,   '5-0-5 Test'],
  [ActivityType.Cut,                 'Cutting Maneuver'],
  [ActivityType.Sprint,              'Sprint'],
  [ActivityType.LateralStepdown,     'Lateral Step Down'],
  [ActivityType.Lunge,               'Lunge'],
];

const RESULT_TYPES: [AnalysisDataType, string][] = [
  ['metrics', 'Metrics  (JSON)'],
  ['report',  'Report   (PDF) '],
  ['data',    'Data     (ZIP) '],
];

async function main() {
  const args = process.argv.slice(2);
  console.log('Connecting...');
  const service = new ModelHealthService({ apiKey: loadApiKey(args[0]), autoInit: false });
  await service.init();

  // Session
  console.log('\nFetching sessions...');
  const sessions = await service.sessionList();
  if (!sessions.length) {
    console.error('No sessions found. Create a session using the Model Health mobile app first.');
    process.exit(1);
  }

  console.log(`\n${sessions.length} session(s):\n`);
  const session = await pickOne(sessions, 'Select session', s => {
    const sn = s.sessionName || '(unnamed)';
    const sub = s.name || '(unnamed)';
    return `[session ID: ${s.id}]  session name: ${sn}  subject: ${sub}`;
  });

  // Activity
  const sn = session.sessionName || '(unnamed)';
  const sub = session.name || '(unnamed)';
  console.log(`\nFetching activities for session ID: ${session.id},  session name: ${sn}, subject: ${sub}...`);
  const allActivities = await service.activityList(session.id);
  const activities = allActivities.filter(a => !INTERNAL_ACTIVITY_NAMES.has(a.name ?? ''));
  if (!activities.length) { console.error('No activities found in this session.'); process.exit(1); }

  console.log(`\n${activities.length} activity/activities:\n`);
  const activity = await pickOne(activities, 'Select activity', a => `${a.name ?? a.id}  [${a.status}]`);

  // Wait for ready
  const activityLabel = activity.name ?? activity.id;
  console.log(`\nChecking status of '${activityLabel}'...`);
  let status = await service.activityStatus(activity);

  if (status.type === 'uploading' || status.type === 'processing') {
    console.log('Waiting for processing to complete...');
    status = await pollActivity(service, activity);
  }

  if (status.type !== 'ready') {
    console.error(`Activity cannot be analysed (status: ${status.type}). Wait for uploads to finish and try again.`);
    process.exit(1);
  }
  console.log('Activity is ready.');

  // Analysis type
  console.log('\nAnalysis type:\n');
  const [analysisType, analysisLabel] = await pickOne(ANALYSIS_TYPES, 'Select analysis type', t => t[1]);

  // Run
  console.log(`\nStarting '${analysisLabel}' analysis...`);
  const task = await service.startAnalysis(analysisType as any, activity, session);

  console.log('Waiting for analysis to complete...');
  const resultStatus = await pollAnalysis(service, task);

  if (resultStatus.type !== 'completed') {
    console.error(`Analysis did not complete (status: ${resultStatus.type}).`);
    process.exit(1);
  }
  console.log('Analysis complete.');

  const freshActivity = await service.fetchActivity(activity.id);

  // Choose results
  console.log('\nWhich results would you like to save?\n');
  const selected = await pickMulti(RESULT_TYPES, 'Select result types', r => r[1]);
  const dataTypes = selected.map(r => r[0]);

  console.log('\nDownloading...');
  const results = await service.analysisDataForActivity(freshActivity, dataTypes);
  const slug = (freshActivity.name ?? freshActivity.id).replace(/ /g, '_');
  for (const r of results) {
    const ext = ANALYSIS_DATA_EXT[r.type] ?? 'bin';
    const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
    console.log(`  Saved ${p}`);
  }

  console.log('\nDone.');
}

async function pollActivity(
  service: ModelHealthService,
  activity: Parameters<typeof service.activityStatus>[0]
) {
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
    await sleep(10_000);
  }
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
