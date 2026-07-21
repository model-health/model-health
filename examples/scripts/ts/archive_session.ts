/**
 * Model Health TypeScript SDK — session archive.
 * Mirrors examples/python/archive_session.py.
 *
 * Usage:
 *   npx tsx archive_session.ts [<api_key>]
 */

import { ModelHealthService } from '@modelhealth/modelhealth';
import type { Archive } from '@modelhealth/modelhealth';
import { loadApiKey, pickOne, confirm, saveFile, sleep, closePrompts } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthService> {
  console.log('Connecting...');
  const service = new ModelHealthService({ apiKey, autoInit: false });
  await service.init();
  return service;
}

async function pickSession(service: ModelHealthService) {
  console.log('\nFetching sessions...');
  const sessions = await service.sessionList();
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
  service: ModelHealthService,
  session: Awaited<ReturnType<typeof pickSession>>,
  withVideos: boolean
): Promise<Archive> {
  console.log(`\nRequesting archive for session '${session.id}'...`);
  const archive = await service.prepareArchive(session, withVideos);

  console.log('Waiting for archive to be ready...');
  const status = await pollArchive(service, archive);

  if (status.type !== 'ready') {
    console.error(`Archive preparation did not complete (status: ${status.type}).`);
    process.exit(1);
  }
  console.log('Archive is ready.');

  return archive;
}

async function downloadArchive(
  service: ModelHealthService,
  archive: Archive,
  session: Awaited<ReturnType<typeof pickSession>>
) {
  console.log('\nDownloading...');
  const data = await service.archiveData(archive);
  const p = saveFile(`ModelHealth_Session_${session.id}.zip`, data);
  console.log(`  Saved ${p}  (${data.length.toLocaleString()} bytes)`);
}

async function main() {
  const args = process.argv.slice(2);
  const service = await connect(loadApiKey(args[0]));
  const session = await pickSession(service);

  console.log();
  const withVideos = await confirm('Include raw video files in the archive?', false);

  const archive = await prepareArchive(service, session, withVideos);
  await downloadArchive(service, archive, session);
  console.log('\nDone.');
}

async function pollArchive(service: ModelHealthService, archive: Archive) {
  while (true) {
    const status = await service.archiveStatus(archive);
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
