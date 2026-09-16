/**
 * Model Health TypeScript SDK — browse subject groups.
 * Mirrors examples/python/list_groups.py.
 *
 * Usage:
 *   npx tsx list_groups.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { SubjectGroup, GroupStream } from '@modelhealth/modelhealth';
import { loadApiKey } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

/** Reads at most `count` groups, then lets the rest go. */
async function firstFew(stream: GroupStream, count: number): Promise<SubjectGroup[]> {
  const taken: SubjectGroup[] = [];
  for await (const group of stream) {
    taken.push(group);
    if (taken.length === count) break;
  }
  stream.close();
  return taken;
}

function describe(group: SubjectGroup): string {
  const last = group.lastActivity ? group.lastActivity.toISOString().slice(0, 10) : 'no activity yet';
  return `${group.name}  ${group.subjectCount} subjects  ${group.totalActivities} activities  ${last}`;
}

/** The whole list: how many match, and what the first few look like. */
async function showEverything(client: ModelHealthClient): Promise<void> {
  console.log('\nEvery subject group');
  const stream = client.groups.list();
  console.log(`  ${await stream.total} match`);
  for (const group of await firstFew(stream, 5)) {
    console.log(`    ${describe(group)}`);
  }
}

/** Search is the only filter a group list takes. */
async function showFilters(client: ModelHealthClient): Promise<void> {
  console.log('\nHow many match each search');
  // Reading the count reads a batch, which does not finish the sequence — so each one is
  // closed by hand rather than left to be collected.
  for (const term of ['test', 'group', 'zzz-nothing-matches-this']) {
    const stream = client.groups.list({ search: term });
    try {
      console.log(`  ${term.padEnd(26)} ${await stream.total}`);
    } finally {
      stream.close();
    }
  }
}

/** Order decides which group comes first. */
async function showOrder(client: ModelHealthClient): Promise<void> {
  console.log('\nFirst group under each order');
  for (const orderBy of ['name', '-name'] as const) {
    const stream = client.groups.list({ orderBy });
    const [first] = await firstFew(stream, 1);
    console.log(`  ${orderBy.padEnd(8)} ${first ? describe(first) : '(nothing matched)'}`);
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
