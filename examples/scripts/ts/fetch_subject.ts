/**
 * Model Health TypeScript SDK — fetch a subject by ID.
 * Mirrors examples/python/fetch_subject.py.
 *
 * Usage:
 *   npx tsx fetch_subject.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Subject } from '@modelhealth/modelhealth';
import { loadApiKey, pickOne, closePrompts } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  return client;
}

async function pickSubject(client: ModelHealthClient): Promise<Subject> {
  console.log('\nFetching subjects...');
  const subjects = await client.subjectList();

  if (!subjects.length) {
    console.error('No subjects found.');
    process.exit(1);
  }

  console.log();
  const subject = await pickOne(subjects, 'Select subject', s => `${s.name}  (ID ${s.id})`);
  console.log(`  Selected: ${subject.name}`);
  return subject;
}

function printSubject(subject: Subject): void {
  console.log(`  Name:             ${subject.name}`);
  console.log(`  Weight:           ${subject.weight ?? '(none)'}`);
  console.log(`  Height:           ${subject.height ?? '(none)'}`);
  console.log(`  Birth year:       ${subject.birthYear ?? '(none)'}`);
  console.log(`  Age:              ${subject.age ?? '(none)'}`);
  console.log(`  Gender:           ${subject.gender}`);
  console.log(`  Sex at birth:     ${subject.sexAtBirth}`);
  console.log(`  Characteristics:  ${subject.characteristics || '(none)'}`);
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));
  const subject = await pickSubject(client);

  console.log(`\nFetching subject ${subject.id}...`);
  const fetched = await client.fetchSubject(subject.id);
  console.log();
  printSubject(fetched);
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
