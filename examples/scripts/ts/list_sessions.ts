/**
 * Model Health TypeScript SDK — browse sessions.
 * Mirrors examples/python/list_sessions.py.
 *
 * Usage:
 *   npx tsx list_sessions.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Session, SessionStream } from '@modelhealth/modelhealth';
import { loadApiKey } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

/** Reads at most `count` sessions, then lets the rest go. */
async function firstFew(stream: SessionStream, count: number): Promise<Session[]> {
  const taken: Session[] = [];
  for await (const session of stream) {
    taken.push(session);
    if (taken.length === count) break;
  }
  stream.close();
  return taken;
}

function describe(session: Session): string {
  const when = session.createdAt.toISOString().slice(0, 10);
  return `${session.name || session.id}  ${session.activitiesCount} activities  ${when}`;
}

/** The whole list: how many match, and what the first few look like. */
async function showEverything(client: ModelHealthClient): Promise<void> {
  console.log('\nEvery session');
  const stream = client.sessions.list();
  console.log(`  ${await stream.total} match`);
  for (const session of await firstFew(stream, 5)) {
    console.log(`    ${describe(session)}`);
  }
}

/** Narrowing to one subject. Sessions take no other filter. */
async function showSubjectFilter(client: ModelHealthClient): Promise<void> {
  console.log('\nHow many belong to each subject');
  const subjects = await client.subjects.list({ limit: 3 }).all();
  if (!subjects.length) {
    console.log('  (no subjects to filter by)');
    return;
  }
  // Reading the count reads a batch, which does not finish the sequence — so each one is
  // closed by hand rather than left to be collected.
  for (const subject of subjects) {
    const stream = client.sessions.list({ subject });
    try {
      console.log(`  ${subject.name.padEnd(24)} ${await stream.total}`);
    } finally {
      stream.close();
    }
  }
}

/** Order decides which session comes first. */
async function showOrder(client: ModelHealthClient): Promise<void> {
  console.log('\nFirst session under each order');
  for (const orderBy of ['createdAt', '-createdAt', 'name'] as const) {
    const stream = client.sessions.list({ orderBy });
    const [first] = await firstFew(stream, 1);
    console.log(`  ${orderBy.padEnd(12)} ${first ? describe(first) : '(nothing matched)'}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));

  await showEverything(client);
  await showSubjectFilter(client);
  await showOrder(client);
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); });
