/**
 * Model Health TypeScript SDK — retrieve biomechanical metrics.
 * Mirrors examples/python/activity_metrics.py.
 *
 * Demonstrates activityMetrics (single-activity dashboard metrics) and
 * subjectMetrics (all metrics across activities for a subject, with optional
 * date filtering).
 *
 * Usage:
 *   npx tsx activity_metrics.ts [<api_key>]
 */

import { ModelHealthService } from '@modelhealth/modelhealth';
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

  if (!metrics.groups.length) {
    console.log('  No metrics available for this activity.');
  } else {
    console.log(`\nActivity metrics (activity type ID: ${metrics.activityTypeId}):\n`);
    for (const group of metrics.groups) {
      console.log(`  ${group.name}`);
      for (const metric of group.metrics) {
        console.log(`    ${metric.name}: ${formatValue(metric.value)}`);
      }
    }
  }

  // Subject metrics (optional)
  console.log('\n' + '-'.repeat(40));
  const subjects = await service.subjectList();
  if (!subjects.length) {
    console.log('\nNo subjects found — skipping subject metrics.');
    console.log('\nDone.');
    return;
  }

  console.log(`\n${subjects.length} subject(s):\n`);
  const subject = await pickOne(subjects, 'Select subject (or Ctrl-C to skip)', s => `[ID: ${s.id}]  ${s.name}`);

  console.log(`\nFetching metrics for subject '${subject.name}' (ID: ${subject.id})...`);
  const subjectMetrics = await service.subjectMetrics(subject.id);

  if (!subjectMetrics.length) {
    console.log('  No metrics found for this subject.');
  } else {
    console.log(`\n  ${subjectMetrics.length} activity result(s):\n`);
    for (const am of subjectMetrics) {
      const total = am.groups.reduce((n: number, g: { metrics: unknown[] }) => n + g.metrics.length, 0);
      console.log(`  Activity ${am.activityId}  (type ID: ${am.activityTypeId})  — ${total} metric(s)`);
    }
  }

  console.log('\nDone.');
}

type MetricValue =
  | { type: 'scalar'; value: number | null }
  | { type: 'bilateral'; left: number | null; right: number | null };

function formatValue(v: MetricValue): string {
  if (v.type === 'scalar') return v.value != null ? String(v.value) : '—';
  const l = v.left != null ? String(v.left) : '—';
  const r = v.right != null ? String(v.right) : '—';
  return `L ${l}  R ${r}`;
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
