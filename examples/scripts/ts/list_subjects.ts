/**
 * Model Health TypeScript SDK — browse subjects.
 * Mirrors examples/python/list_subjects.py.
 *
 * Usage:
 *   npx tsx list_subjects.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Subject, SubjectStream } from '@modelhealth/modelhealth';
import { loadApiKey } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

/** Reads at most `count` subjects, then lets the rest go. */
async function firstFew(stream: SubjectStream, count: number): Promise<Subject[]> {
  const taken: Subject[] = [];
  for await (const subject of stream) {
    taken.push(subject);
    if (taken.length === count) break;
  }
  stream.close();
  return taken;
}

function describe(subject: Subject): string {
  const height = subject.height ?? '(no height)';
  const weight = subject.weight ?? '(no weight)';
  return `${subject.name}  (ID ${subject.id})  ${height} / ${weight}`;
}

/** The whole list: how many match, and what the first few look like. */
async function showEverything(client: ModelHealthClient): Promise<void> {
  console.log('\nEvery subject');
  const stream = client.subjects.list();
  console.log(`  ${await stream.total} match`);
  for (const subject of await firstFew(stream, 5)) {
    console.log(`    ${describe(subject)}`);
  }
}

/** Each filter narrows the count, without anything being read. */
async function showFilters(client: ModelHealthClient): Promise<void> {
  console.log('\nHow many match each filter');
  const counts: [string, SubjectStream][] = [
    ['named "test"', client.subjects.list({ search: 'test' })],
    ['added in 2025', client.subjects.list({
      createdAfter: new Date('2025-01-01'),
      createdBefore: new Date('2025-12-31'),
    })],
    ['with a completed activity', client.subjects.list({ activityComplete: true })],
  ];
  // Reading the count reads a batch, which does not finish the sequence — so each one is
  // closed by hand rather than left to be collected.
  for (const [label, stream] of counts) {
    try {
      console.log(`  ${label.padEnd(26)} ${await stream.total}`);
    } finally {
      stream.close();
    }
  }
}

/** Order decides which subject comes first. */
async function showOrder(client: ModelHealthClient): Promise<void> {
  console.log('\nFirst subject under each order');
  for (const orderBy of ['name', '-name', '-createdAt'] as const) {
    const stream = client.subjects.list({ orderBy });
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
