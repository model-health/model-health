/**
 * Model Health TypeScript SDK — download and inspect kinematics for an activity.
 * Mirrors examples/python/plot_kinematics.py.
 *
 * Saves the kinematics CSV and prints available column names. Open the CSV in
 * a spreadsheet application (Numbers, Excel, Google Sheets) or a Python/R
 * script to produce a plot.
 *
 * Usage:
 *   npx tsx plot_kinematics.ts [<api_key>]
 */

import { ModelHealthService } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES,
  pickOne, saveFile, closePrompts,
} from './_shared.js';

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
  const sessionLabel = session.sessionName || session.name || session.id;
  console.log(`\nFetching activities for session '${sessionLabel}'...`);
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

  // Download kinematics CSV
  console.log('\nDownloading kinematics CSV...');
  const results = await service.motionDataForActivity(activity, ['kinematics_csv']);
  if (!results.length) {
    console.error('No kinematics CSV data returned for this activity.');
    process.exit(1);
  }

  const csvData = results[0].data;
  const slug = activityLabel.replace(/ /g, '_');
  const csvPath = saveFile(`${slug}_kinematics.csv`, csvData);
  console.log(`  Saved: ${csvPath}`);

  // Parse headers
  const csvText = new TextDecoder().decode(csvData);
  const dataLines = csvText.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const headers = dataLines[0]?.split(',').map(h => h.trim()) ?? [];

  if (headers.length < 2) {
    console.log('\nCSV contains no data columns to display.');
    console.log('\nDone.');
    return;
  }

  const timeCol = headers[0];
  const dataCols = headers.slice(1);

  console.log(`\nTime column:  ${timeCol}`);
  console.log(`\n${dataCols.length} data column(s):\n`);
  dataCols.forEach((col, i) => console.log(`  ${String(i + 1).padStart(3)}. ${col}`));

  console.log(`\nThe kinematics CSV has been saved to:\n  ${csvPath}`);
  console.log('\nOpen it in Numbers, Excel, or Google Sheets to plot joint angles over time.');
  console.log('\nDone.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
