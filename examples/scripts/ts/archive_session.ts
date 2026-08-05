/**
 * Model Health TypeScript SDK — session archive.
 * Mirrors examples/python/archive_session.py.
 *
 * Usage:
 *   npx tsx archive_session.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Archive } from '@modelhealth/modelhealth';
import { loadApiKey, pickOne, confirm, saveFile, sleep, closePrompts } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
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
  return pickOne(sessions, 'Select session to archive', s => {
    const sn = s.sessionName || '(unnamed)';
    const sub = s.name || '(unnamed)';
    const actWord = s.activitiesCount === 1 ? 'activity' : 'activities';
    return `[session ID: ${s.id}]  session name: ${sn}  subject: ${sub}  ${s.activitiesCount} ${actWord}`;
  });
}

async function prepareArchive(
  client: ModelHealthClient,
  session: Awaited<ReturnType<typeof pickSession>>,
  withVideos: boolean
): Promise<Archive> {
  console.log(`\nRequesting archive for session '${session.id}'...`);
  const archive = await client.prepareArchive(session, withVideos);

  console.log('Waiting for archive to be ready...');
  const status = await pollArchive(client, archive);

  if (status.type !== 'ready') {
    console.error(`Archive preparation did not complete (status: ${status.type}).`);
    process.exit(1);
  }
  console.log('Archive is ready.');

  return archive;
}

async function downloadArchive(
  client: ModelHealthClient,
  archive: Archive,
  session: Awaited<ReturnType<typeof pickSession>>
) {
  console.log('\nDownloading...');
  const data = await client.archiveData(archive);
  const p = saveFile(`ModelHealth_Session_${session.id}.zip`, data);
  console.log(`  Saved ${p}  (${data.length.toLocaleString()} bytes)`);
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));
  const session = await pickSession(client);

  console.log();
  const withVideos = await confirm('Include raw video files in the archive?', false);

  const archive = await prepareArchive(client, session, withVideos);
  await downloadArchive(client, archive, session);
  console.log('\nDone.');
}

async function pollArchive(client: ModelHealthClient, archive: Archive) {
  while (true) {
    const status = await client.archiveStatus(archive);
    if (status.type === 'processing') {
      process.stdout.write('  Preparing archive...  \r');
    } else {
      process.stdout.write('\n');
      return status;
    }
    await sleep(2_000);
  }
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
