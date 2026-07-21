/**
 * Model Health TypeScript SDK — set video upload mode.
 * Mirrors examples/python/video_upload_mode.py.
 *
 * Usage:
 *   npx tsx video_upload_mode.ts [<api_key>]
 */

import { ModelHealthService } from '@modelhealth/modelhealth';
import type { VideoUploadMode } from '@modelhealth/modelhealth';
import { loadApiKey, pickOne, closePrompts } from './_shared.js';

const MODES: VideoUploadMode[] = ['enabled', 'disabled', 'flush'];

const MODE_DESCRIPTIONS: Record<VideoUploadMode, string> = {
  enabled: 'Devices upload recorded video normally.',
  disabled: 'Devices stop uploading recorded video.',
  flush: 'Re-enables uploads, and uploads any videos queued locally while disabled.',
};

async function main() {
  const args = process.argv.slice(2);
  console.log('Connecting...');
  const service = new ModelHealthService({ apiKey: loadApiKey(args[0]), autoInit: false });
  await service.init();

  console.log();
  const mode = await pickOne(MODES, 'Select video upload mode', m => `${m}  —  ${MODE_DESCRIPTIONS[m]}`);

  console.log(`\nSetting video upload mode to '${mode}'...`);
  await service.setVideoUploadMode(mode);

  console.log('Done.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
