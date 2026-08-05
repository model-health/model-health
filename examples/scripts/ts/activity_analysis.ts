/**
 * Model Health TypeScript SDK — post-capture analysis workflow.
 * Mirrors examples/python/activity_analysis.py.
 *
 * Usage:
 *   npx tsx activity_analysis.ts [<api_key>]
 */

import { ModelHealthClient, ActivityType } from '@modelhealth/modelhealth';
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
  ['report',  'Report   (PDF) '],
  ['data',    'Data     (ZIP) '],
];

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

async function pickSession(client: ModelHealthClient) {
  console.log('\nFetching sessions...');
  const sessions = await client.sessionList();
  if (!sessions.length) {
    console.error('No sessions found. Create a session using the Model Health mobile app first.');
    process.exit(1);
  }

  console.log(`\n${sessions.length} session(s):\n`);
  return pickOne(sessions, 'Select session', s => {
    const sn = s.sessionName || '(unnamed)';
    const sub = s.name || '(unnamed)';
    return `[session ID: ${s.id}]  session name: ${sn}  subject: ${sub}`;
  });
}

async function pickActivity(client: ModelHealthClient, session: Awaited<ReturnType<typeof pickSession>>) {
  const sn = session.sessionName || '(unnamed)';
  const sub = session.name || '(unnamed)';
  console.log(`\nFetching activities for session ID: ${session.id},  session name: ${sn}, subject: ${sub}...`);
  const allActivities = await client.activityList(session.id);
  const activities = allActivities.filter(a => !INTERNAL_ACTIVITY_NAMES.has(a.name ?? ''));
  if (!activities.length) { console.error('No activities found in this session.'); process.exit(1); }

  console.log(`\n${activities.length} activity/activities:\n`);
  return pickOne(
    activities,
    'Select activity',
    a => `${a.name ?? a.id}  [${a.status}]` + (a.activityType ? `  ${a.activityType}` : '')
  );
}

async function ensureReady(client: ModelHealthClient, activity: Awaited<ReturnType<typeof pickActivity>>) {
  const activityLabel = activity.name ?? activity.id;
  console.log(`\nChecking status of '${activityLabel}'...`);
  let status = await client.activityStatus(activity);

  if (status.type === 'uploading' || status.type === 'processing') {
    console.log('Waiting for processing to complete...');
    status = await pollActivity(client, activity);
  }

  if (status.type !== 'ready') {
    console.error(`Activity cannot be analysed (status: ${status.type}). Wait for uploads to finish and try again.`);
    process.exit(1);
  }
  console.log('Activity is ready.');
}

async function startAnalysis(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof pickActivity>>,
  session: Awaited<ReturnType<typeof pickSession>>
) {
  // Default to the activity's recorded type if available.
  const defaultAnalysis = ANALYSIS_TYPES.find(t => t[0] === activity.activityType);
  console.log('\nAnalysis type:\n');
  const [analysisType, analysisLabel] = await pickOne(
    ANALYSIS_TYPES, 'Select analysis type', t => t[1], defaultAnalysis
  );

  console.log(`\nStarting '${analysisLabel}' analysis...`);
  return client.startAnalysis(analysisType as any, activity, session);
}

async function waitForAnalysis(
  client: ModelHealthClient,
  task: Awaited<ReturnType<typeof startAnalysis>>,
  activity: Awaited<ReturnType<typeof pickActivity>>
) {
  console.log('Waiting for analysis to complete...');
  const resultStatus = await pollAnalysis(client, task);

  if (resultStatus.type !== 'completed') {
    console.error(`Analysis did not complete (status: ${resultStatus.type}).`);
    process.exit(1);
  }
  console.log('Analysis complete.');

  return client.fetchActivity(activity.id);
}

async function downloadResults(client: ModelHealthClient, activity: Awaited<ReturnType<typeof waitForAnalysis>>) {
  console.log('\nWhich results would you like to save?\n');
  const selected = await pickMulti(RESULT_TYPES, 'Select result types', r => r[1]);
  const dataTypes = selected.map(r => r[0]);

  const slug = (activity.name ?? activity.id).replace(/ /g, '_');

  console.log('\nDownloading...');
  const results = await client.analysisDataForActivity(activity, dataTypes);
  for (const r of results) {
    const ext = ANALYSIS_DATA_EXT[r.type] ?? 'bin';
    const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
    console.log(`  Saved ${p}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));
  const session = await pickSession(client);
  const activity = await pickActivity(client, session);
  await ensureReady(client, activity);

  const task = await startAnalysis(client, activity, session);
  const freshActivity = await waitForAnalysis(client, task, activity);
  await downloadResults(client, freshActivity);

  console.log('\nDone.');
}

async function pollActivity(
  client: ModelHealthClient,
  activity: Parameters<typeof client.activityStatus>[0]
) {
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
    await sleep(10_000);
  }
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
