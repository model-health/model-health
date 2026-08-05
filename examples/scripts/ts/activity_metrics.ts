/**
 * Model Health TypeScript SDK — retrieve biomechanical metrics.
 * Mirrors examples/python/activity_metrics.py.
 *
 * Demonstrates activityMetrics (single-activity dashboard metrics).
 *
 * Usage:
 *   npx tsx activity_metrics.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { ActivityMetrics, MetricValue } from '@modelhealth/modelhealth';
import { activityMetricsToJson } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES,
  pickOne, confirm, saveFile, closePrompts,
} from './_shared.js';

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
    return `[session ID: ${s.id}]  session name: ${sn}  subject: ${sub}`;
  });
}

async function pickActivity(client: ModelHealthClient, session: Awaited<ReturnType<typeof pickSession>>) {
  console.log(`\nFetching activities for session ID: ${session.id}...`);
  const allActivities = await client.activityList(session.id);
  const activities = allActivities.filter(a => !INTERNAL_ACTIVITY_NAMES.has(a.name ?? ''));
  if (!activities.length) { console.error('No activities found in this session.'); process.exit(1); }

  console.log(`\n${activities.length} activity/activities:\n`);
  return pickOne(activities, 'Select activity', a => `${a.name ?? a.id}  [${a.status}]`);
}

async function showMetrics(client: ModelHealthClient, activity: Awaited<ReturnType<typeof pickActivity>>) {
  const activityLabel = activity.name ?? activity.id;
  console.log(`\nFetching metrics for '${activityLabel}'...`);
  const metrics = await client.activityMetrics(activity.id);

  const flat = flattenMetrics(metrics);
  if (!flat.size) {
    console.log('  No metrics available for this activity.');
    return;
  }

  console.log('\nActivity metrics:\n');
  for (const [name, value] of flat) {
    console.log(`  ${name}: ${formatValue(value)}`);
  }

  if (await confirm('\nSave metrics as JSON?', false)) {
    const slug = activityLabel.replace(/ /g, '_');
    const p = saveFile(`${slug}_metrics.json`, Buffer.from(activityMetricsToJson(metrics), 'utf-8'));
    console.log(`  Saved ${p}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));
  const session = await pickSession(client);
  const activity = await pickActivity(client, session);
  await showMetrics(client, activity);

  console.log('\nDone.');
}

/**
 * Collapse the grouped metrics into a flat name -> value map.
 * Groups are discarded and each metric appears exactly once; the first
 * occurrence of a name wins.
 */
function flattenMetrics(metrics: ActivityMetrics): Map<string, MetricValue> {
  const flat = new Map<string, MetricValue>();
  for (const group of metrics.groups) {
    for (const metric of group.metrics) {
      if (!flat.has(metric.name)) flat.set(metric.name, metric.value);
    }
  }
  return flat;
}

function formatValue(v: MetricValue): string {
  if (v.type === 'scalar') return v.value != null ? String(v.value) : '—';
  const l = v.left != null ? String(v.left) : '—';
  const r = v.right != null ? String(v.right) : '—';
  return `L ${l}  R ${r}`;
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
