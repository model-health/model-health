/**
 * Model Health TypeScript SDK — retrieve biomechanical metrics.
 * Mirrors examples/python/activity_metrics.py.
 *
 * Demonstrates activityMetrics (single-activity dashboard metrics).
 *
 * Usage:
 *   npx tsx activity_metrics.ts [<api_key>]
 */

import { ModelHealthService } from '@modelhealth/modelhealth';
import type { ActivityMetrics, MetricValue } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES,
  pickOne, closePrompts,
} from './_shared.js';

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

  // Activity metrics
  const activityLabel = activity.name ?? activity.id;
  console.log(`\nFetching metrics for '${activityLabel}'...`);
  const metrics = await service.activityMetrics(activity.id);

  const flat = flattenMetrics(metrics);
  if (!flat.size) {
    console.log('  No metrics available for this activity.');
  } else {
    console.log('\nActivity metrics:\n');
    for (const [name, value] of flat) {
      console.log(`  ${name}: ${formatValue(value)}`);
    }
  }

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
