/**
 * Model Health TypeScript SDK — browse activities.
 * Mirrors examples/python/list_activities.py.
 *
 * Usage:
 *   npx tsx list_activities.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Activity, ActivityStream } from '@modelhealth/modelhealth';
import { loadApiKey } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

/** Reads at most `count` activities, then lets the rest go. */
async function firstFew(stream: ActivityStream, count: number): Promise<Activity[]> {
  const taken: Activity[] = [];
  for await (const activity of stream) {
    taken.push(activity);
    if (taken.length === count) break;
  }
  stream.close();
  return taken;
}

function describe(activity: Activity): string {
  const type = activity.activityType?.displayName ?? '(no type)';
  const when = activity.createdAt.toISOString().slice(0, 10);
  return `${activity.name ?? activity.id}  [${type}]  ${activity.status}  ${when}`;
}

/** The whole list: how many match, and what the first few look like. */
async function showEverything(client: ModelHealthClient): Promise<void> {
  console.log('\nEvery activity');
  const stream = client.activities.list();
  console.log(`  ${await stream.total} match`);
  for (const activity of await firstFew(stream, 5)) {
    console.log(`    ${describe(activity)}`);
  }
}

/** Each filter narrows the count, without anything being read. */
async function showFilters(client: ModelHealthClient): Promise<void> {
  console.log('\nHow many match each filter');
  const counts: [string, ActivityStream][] = [
    ['only completed', client.activities.list({ onlyCompleted: true })],
    ['named "squat"', client.activities.list({ search: 'squat' })],
    ['recorded in 2025', client.activities.list({
      createdAfter: new Date('2025-01-01'),
      createdBefore: new Date('2025-12-31'),
    })],
    ['calibration included', client.activities.list({ excludeCalibration: false })],
  ];
  // Reading the count reads a batch, which does not finish the sequence — so each one is
  // closed by hand rather than left to be collected.
  for (const [label, stream] of counts) {
    try {
      console.log(`  ${label.padEnd(24)} ${await stream.total}`);
    } finally {
      stream.close();
    }
  }
}

/** Order decides which activity comes first. */
async function showOrder(client: ModelHealthClient): Promise<void> {
  console.log('\nFirst activity under each order');
  for (const orderBy of ['createdAt', '-createdAt', 'status'] as const) {
    const stream = client.activities.list({ orderBy });
    const [first] = await firstFew(stream, 1);
    console.log(`  ${orderBy.padEnd(12)} ${first ? describe(first) : '(nothing matched)'}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));

  await showEverything(client);
  await showFilters(client);
  await showOrder(client);
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); });
