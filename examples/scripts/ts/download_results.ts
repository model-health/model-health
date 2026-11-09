/**
 * Model Health TypeScript SDK — fetch an activity's results.
 * Mirrors examples/python/download_results.py, which also saves them into a directory;
 * here the bytes are written out by hand, under the same file names.
 *
 * Takes the most recent activity whose processing has finished and:
 *   1. Fetches its results into memory, saying why any is missing
 *   2. Writes each one to a file
 *
 * Usage:
 *   npx tsx download_results.ts [<api_key>]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Activity, ArtifactType } from '@modelhealth/modelhealth';
import { loadApiKey } from './_shared.js';

const RESULTS: ArtifactType[] = ['metrics', 'report', 'data', 'kinematics_csv'];

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

/** The newest activity whose processing has finished, or undefined when there is none. */
async function latestFinished(client: ModelHealthClient): Promise<Activity | undefined> {
  const stream = client.activities.list({ orderBy: '-createdAt', onlyCompleted: true, limit: 1 });
  const [activity] = await stream.all();
  return activity;
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));

  const activity = await latestFinished(client);
  if (!activity) {
    console.log('No activity has finished processing yet.');
    return;
  }
  console.log(`\nActivity ${activity.name ?? activity.id}: has results = ${activity.hasResults}`);

  const fetched = await client.fetchArtifacts(activity, RESULTS);

  console.log('\nFetched into memory');
  for (const [kind, bytes] of Object.entries(fetched.data)) {
    console.log(`  ${kind.padEnd(15)} ${String(bytes.length).padStart(9)} bytes`);
  }
  for (const [kind, error] of Object.entries(fetched.errors)) {
    console.log(`  ${kind.padEnd(15)} not fetched: ${error.message}`);
  }

  const directory = 'results';
  await mkdir(directory, { recursive: true });
  console.log(`\nWritten to ${directory}/`);
  for (const [kind, bytes] of Object.entries(fetched.data)) {
    const file = join(directory, client.artifactFileName(activity, kind as ArtifactType));
    await writeFile(file, bytes);
    console.log(`  ${file}`);
  }
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); });
