/**
 * Model Health TypeScript SDK — download data from an existing session.
 * Mirrors examples/python/session_data.py.
 *
 * Usage:
 *   npx tsx session_data.ts [<api_key>]
 */

import { ModelHealthClient, ActivityType } from '@modelhealth/modelhealth';
import type { VideoVersion, MotionDataType, AnalysisDataType } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES, MOTION_DATA_EXT, ANALYSIS_DATA_EXT,
  pickOne, pickMulti, saveFile, closePrompts,
} from './_shared.js';

const VIDEO_VERSIONS: [VideoVersion, string][] = [
  ['raw',    'Raw      (per-camera original recordings)'],
  ['synced', 'Synced   (temporally-synchronised output) '],
];

const MOTION_DATA_TYPES: [MotionDataType, string][] = [
  ['kinematics_mot', 'Kinematics  (MOT)'],
  ['kinematics_csv', 'Kinematics  (CSV)'],
  ['markers_trc',    'Markers     (TRC)'],
  ['markers_csv',    'Markers     (CSV)'],
];

const ANALYSIS_DATA_TYPES: [AnalysisDataType, string][] = [
  ['report',  'Report   (PDF) '],
  ['data',    'Data     (ZIP) '],
];

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting to Model Health...');
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
    return `[session ID: ${s.id}]  session name: ${sn}  subject: ${sub}  created: ${s.createdAt}`;
  });
}

/** Returns the picked activity alongside all_activities — needed later for the neutral-model lookup. */
async function pickActivity(client: ModelHealthClient, session: Awaited<ReturnType<typeof pickSession>>) {
  console.log(`\nFetching activities for session ID: ${session.id}...`);
  const allActivities = await client.activityList(session.id);
  const activities = allActivities.filter(a => !INTERNAL_ACTIVITY_NAMES.has(a.name ?? ''));
  if (!activities.length) { console.error('No activities found in this session.'); process.exit(1); }

  console.log(`\n${activities.length} activity/activities:\n`);
  const activity = await pickOne(
    activities,
    'Select activity',
    a => `${a.name ?? a.id}  [${a.status}]` + (a.activityType ? `  ${a.activityType}` : '') + `  updated: ${a.updatedAt}`
  );
  return { activity, allActivities };
}

async function ensureReady(client: ModelHealthClient, activity: Awaited<ReturnType<typeof pickActivity>>['activity']) {
  const activityLabel = activity.name ?? activity.id;
  console.log(`\nChecking status of '${activityLabel}'...`);
  const status = await client.activityStatus(activity);
  if (status.type !== 'ready') {
    console.error(`Activity '${activityLabel}' is not ready (status: ${status.type}). Wait for processing to complete and try again.`);
    process.exit(1);
  }
  console.log('Activity is ready.');
}

async function downloadVideos(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof pickActivity>>['activity'],
  slug: string
) {
  console.log('\nWhich video versions would you like to download?\n');
  const selectedVersions = await pickMulti(VIDEO_VERSIONS, 'Select video versions', v => v[1]);

  console.log('\nDownloading videos...');
  for (const [version, versionLabel] of selectedVersions) {
    const versionSlug = version === 'raw' ? 'raw' : 'synced';
    console.log(`  ${versionLabel.trim()}...`);
    const videos = await client.videosForActivity(activity, version);
    if (!videos.length) {
      console.log('  No videos available for this activity.');
    } else {
      for (let i = 0; i < videos.length; i++) {
        const p = saveFile(`${slug}_video_${versionSlug}_${i}.mp4`, videos[i]);
        console.log(`  Saved: ${p}`);
      }
    }
  }
}

async function downloadMotionData(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof pickActivity>>['activity'],
  slug: string
) {
  console.log('\nWhich motion data would you like to download?\n');
  const selectedMotion = await pickMulti(MOTION_DATA_TYPES, 'Select motion data types', t => t[1]);
  const motionTypes = selectedMotion.map(t => t[0]);

  console.log('\nDownloading motion data...');
  const motionResults = await client.motionDataForActivity(activity, motionTypes);
  if (!motionResults.length) {
    console.log('  No motion data available.');
    return;
  }

  for (const r of motionResults) {
    const ext = MOTION_DATA_EXT[r.type] ?? 'bin';
    const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
    console.log(`  Saved: ${p}`);
  }
}

async function downloadAnalysisData(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof pickActivity>>['activity'],
  slug: string
) {
  console.log('\nWhich analysis results would you like to download?\n');
  const selectedAnalysis = await pickMulti(ANALYSIS_DATA_TYPES, 'Select analysis data types', t => t[1]);
  const analysisTypes = selectedAnalysis.map(t => t[0]);

  console.log('\nDownloading analysis data...');
  const analysisResults = await client.analysisDataForActivity(activity, analysisTypes);
  if (!analysisResults.length) {
    console.log('  No analysis data available.');
    return;
  }

  for (const r of analysisResults) {
    const ext = ANALYSIS_DATA_EXT[r.type] ?? 'bin';
    const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
    console.log(`  Saved: ${p}`);
  }
}

async function downloadNeutralModel(
  client: ModelHealthClient,
  allActivities: Awaited<ReturnType<typeof pickActivity>>['allActivities']
) {
  const neutralActivities = allActivities.filter(a => a.name === 'neutral');
  const neutral = neutralActivities[neutralActivities.length - 1];
  if (!neutral) return;

  console.log(`\nDownloading OpenSim model for neutral activity (id: ${neutral.id})...`);
  const neutralStatus = await client.activityStatus(neutral);
  if (neutralStatus.type !== 'ready') {
    console.log(`  Skipping: neutral activity status is '${neutralStatus.type}' (expected 'ready').`);
    return;
  }

  const modelResults = await client.motionDataForActivity(neutral, ['model']);
  for (const r of modelResults) {
    const ext = MOTION_DATA_EXT[r.type] ?? 'bin';
    const p = saveFile(`neutral_${r.type}.${ext}`, r.data);
    console.log(`  Saved: ${p}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));
  const session = await pickSession(client);
  const { activity, allActivities } = await pickActivity(client, session);
  await ensureReady(client, activity);

  const activityLabel = activity.name ?? activity.id;
  const slug = activityLabel.replace(/ /g, '_');
  await downloadVideos(client, activity, slug);
  await downloadMotionData(client, activity, slug);
  await downloadAnalysisData(client, activity, slug);
  await downloadNeutralModel(client, allActivities);

  console.log('\nDone.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
