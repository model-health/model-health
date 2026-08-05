/**
 * Model Health TypeScript SDK — external data upload.
 * Mirrors examples/python/add_external_data.py.
 *
 * Usage:
 *   npx tsx add_external_data.ts [<api_key>]
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModelHealthClient, type Activity, type ExternalResultFile } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES,
  pickOne, prompt, closePrompts,
} from './_shared.js';

async function main() {
  const args = process.argv.slice(2);
  const client = new ModelHealthClient({ apiKey: loadApiKey(args[0]), autoInit: false });
  await client.init();

  // Session
  console.log('\nFetching sessions...');
  const sessions = await client.sessionList();
  if (!sessions.length) { console.error('No sessions found.'); process.exit(1); }

  console.log(`\n${sessions.length} session(s):\n`);
  const session = await pickOne(sessions, 'Select session', s => {
    const sn = s.sessionName || '(unnamed)';
    const sub = s.name || '(unnamed)';
    return `[${s.id}]  ${sn}  —  subject: ${sub}`;
  });

  // Activities
  console.log(`\nFetching activities for session ${session.id}...`);
  const allActivities = await client.activityList(session.id);
  const activities = allActivities.filter(a => !INTERNAL_ACTIVITY_NAMES.has(a.name ?? ''));
  if (!activities.length) { console.error('No activities found in this session.'); process.exit(1); }

  console.log(`\n${activities.length} activity/activities:\n`);
  const activity = await pickOne(activities, 'Select activity', a => `${a.name ?? a.id}  [${a.status}]`);

  // Files
  const files = await promptFiles();

  console.log(`\nUploading ${files.length} file(s)...`);
  await client.addMotionDataToActivity(activity, files);
  console.log('\nDone.');
}

async function promptFiles(): Promise<ExternalResultFile[]> {
  const files: ExternalResultFile[] = [];
  console.log('\nEnter the files to attach (leave path blank to finish).');
  console.log("Tag:  a short identifier for the data source, e.g. 'my-force-plate'.");
  console.log();

  while (true) {
    const rawPath = (await prompt('  File path (or Enter to finish): ')).trim();
    if (!rawPath) {
      if (!files.length) { console.log('  At least one file is required.'); continue; }
      break;
    }

    const resolved = path.resolve(rawPath.replace(/^~/, process.env.HOME ?? '~'));
    if (!fs.existsSync(resolved)) { console.log(`  File not found: ${resolved}`); continue; }

    const tag = (await prompt('  Tag for this file: ')).trim();
    if (!tag) { console.log('  Tag must not be empty.'); continue; }

    let data: Buffer;
    try { data = fs.readFileSync(resolved); } catch (e) { console.log(`  Could not read file: ${e}`); continue; }

    const ext = path.extname(resolved).replace(/^\./, '');
    let extension = ext;
    if (!extension) {
      extension = (await prompt('  File extension (e.g. csv, bin): ')).trim();
      if (!extension) { console.log('  Extension must not be empty.'); continue; }
    }

    files.push({ tag, extension, data: new Uint8Array(data) });
    console.log(`  Added: ${path.basename(resolved)} (tag=${JSON.stringify(tag)}, extension=${JSON.stringify(extension)})`);
  }

  return files;
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
