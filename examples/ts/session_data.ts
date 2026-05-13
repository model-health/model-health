/**
 * Model Health TypeScript SDK — download data from an existing session.
 * Mirrors examples/python/session_data.py.
 *
 * Usage:
 *   npx tsx session_data.ts [<api_key>]
 */

import { ModelHealthService, ActivityType } from '@modelhealth/modelhealth';
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
  ['metrics', 'Metrics  (JSON)'],
  ['report',  'Report   (PDF) '],
  ['data',    'Data     (ZIP) '],
];

async function main() {
  const args = process.argv.slice(2);
  console.log('Connecting to Model Health...');
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

  // Activities
  console.log(`\nFetching activities for session ID: ${session.id}...`);
  const allActivities = await service.activityList(session.id);
  const activities = allActivities.filter(a => !INTERNAL_ACTIVITY_NAMES.has(a.name ?? ''));
  if (!activities.length) { console.error('No activities found in this session.'); process.exit(1); }

  console.log(`\n${activities.length} activity/activities:\n`);
  const activity = await pickOne(activities, 'Select activity', a => `${a.name ?? a.id}  [${a.status}]`);

  // Check status
  const activityLabel = activity.name ?? activity.id;
  console.log(`\nChecking status of '${activityLabel}'...`);
  const status = await service.activityStatus(activity);
  if (status.type !== 'ready') {
    console.error(`Activity '${activityLabel}' is not ready (status: ${status.type}). Wait for processing to complete and try again.`);
    process.exit(1);
  }
  console.log('Activity is ready.');

  const slug = activityLabel.replace(/ /g, '_');

  // Videos
  console.log('\nWhich video versions would you like to download?\n');
  const selectedVersions = await pickMulti(VIDEO_VERSIONS, 'Select video versions', v => v[1]);

  console.log('\nDownloading videos...');
  for (const [version, versionLabel] of selectedVersions) {
    const versionSlug = version === 'raw' ? 'raw' : 'synced';
    console.log(`  ${versionLabel.trim()}...`);
    const videos = await service.videosForActivity(activity, version);
    if (!videos.length) {
      console.log('  No videos available for this activity.');
    } else {
      for (let i = 0; i < videos.length; i++) {
        const p = saveFile(`${slug}_video_${versionSlug}_${i}.mp4`, videos[i]);
        console.log(`  Saved: ${p}`);
      }
    }
  }

  // Motion data
  console.log('\nWhich motion data would you like to download?\n');
  const selectedMotion = await pickMulti(MOTION_DATA_TYPES, 'Select motion data types', t => t[1]);
  const motionTypes = selectedMotion.map(t => t[0]);

  console.log('\nDownloading motion data...');
  const motionResults = await service.motionDataForActivity(activity, motionTypes);
  if (!motionResults.length) {
    console.log('  No motion data available.');
  } else {
    for (const r of motionResults) {
      const ext = MOTION_DATA_EXT[r.type] ?? 'bin';
      const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
      console.log(`  Saved: ${p}`);
    }
  }

  // Analysis data
  console.log('\nWhich analysis results would you like to download?\n');
  const selectedAnalysis = await pickMulti(ANALYSIS_DATA_TYPES, 'Select analysis data types', t => t[1]);
  const analysisTypes = selectedAnalysis.map(t => t[0]);

  console.log('\nDownloading analysis data...');
  const analysisResults = await service.analysisDataForActivity(activity, analysisTypes);
  if (!analysisResults.length) {
    console.log('  No analysis data available.');
  } else {
    for (const r of analysisResults) {
      const ext = ANALYSIS_DATA_EXT[r.type] ?? 'bin';
      const p = saveFile(`${slug}_${r.type}.${ext}`, r.data);
      console.log(`  Saved: ${p}`);
    }
  }

  // OpenSim model from neutral activity
  const neutralActivities = allActivities.filter(a => a.name === 'neutral');
  const neutral = neutralActivities[neutralActivities.length - 1];
  if (neutral) {
    console.log(`\nDownloading OpenSim model for neutral activity (id: ${neutral.id})...`);
    const neutralStatus = await service.activityStatus(neutral);
    if (neutralStatus.type !== 'ready') {
      console.log(`  Skipping: neutral activity status is '${neutralStatus.type}' (expected 'ready').`);
    } else {
      const modelResults = await service.motionDataForActivity(neutral, ['model']);
      for (const r of modelResults) {
        const ext = MOTION_DATA_EXT[r.type] ?? 'bin';
        const p = saveFile(`neutral_${r.type}.${ext}`, r.data);
        console.log(`  Saved: ${p}`);
      }
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
