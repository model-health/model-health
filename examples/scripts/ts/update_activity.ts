/**
 * Model Health TypeScript SDK — update activity metadata.
 * Mirrors examples/python/update_activity.py.
 *
 * Usage:
 *   npx tsx update_activity.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { Activity } from '@modelhealth/modelhealth';
import {
  loadApiKey,
  pickOne, prompt, closePrompts, attachLogging,
} from './_shared.js';

/**
 * Every activity recorded for this subject, newest first.
 *
 * `list(...)` returns a sequence that fetches as it is read; `all()` collects it. Calibration
 * and neutral-pose activities are left out by default, so there is nothing to filter here.
 */
async function loadActivities(
  client: ModelHealthClient,
  subject: { id: number }
): Promise<Activity[]> {
  return client.activities.list({ subject: subject.id, orderBy: '-createdAt' }).all();
}

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  attachLogging(client);
  return client;
}

async function pickSubject(client: ModelHealthClient) {
  console.log('\nFetching subjects...');
  const subjects = await client.subjects.list().all();

  if (!subjects.length) {
    console.error('No subjects found.');
    process.exit(1);
  }

  console.log();
  const subject = await pickOne(subjects, 'Select subject', s => `${s.name}  (ID ${s.id})`);
  console.log(`  Selected: ${subject.name}`);
  return subject;
}

async function pickActivity(client: ModelHealthClient, subject: Awaited<ReturnType<typeof pickSubject>>) {
  console.log(`\nFetching activities for ${subject.name}...`);
  const activities = await loadActivities(client, subject);

  if (!activities.length) {
    console.error(`No activities found for ${subject.name}.`);
    process.exit(1);
  }

  console.log();
  const activity = await pickOne(
    activities,
    'Select activity',
    a => `${a.name ?? a.id}  [${a.status}]` + (a.activityType ? `  ${a.activityType.displayName}` : '')
  );
  console.log(`  Selected: ${activity.name ?? activity.id}`);
  return activity;
}

/** Returns undefined if the user made no changes. */
async function promptEdits(activity: Awaited<ReturnType<typeof pickActivity>>) {
  console.log('\nUpdate activity (press Enter to keep current value):');
  console.log(`  Current activity type: ${activity.activityType?.displayName ?? '(none)'}`);
  const currentTags = activity.tags?.length ? activity.tags.join(', ') : '(none)';
  console.log(`  Current tags: ${currentTags}`);

  const newName = (await prompt(`  Name [${activity.name ?? activity.id}]: `)).trim() || undefined;

  const addInput = (await prompt('  Tags to add, comma-separated (press Enter to skip): ')).trim();
  const addTags = addInput ? addInput.split(',').map(t => t.trim()).filter(Boolean) : [];

  const removeInput = (await prompt('  Tags to remove, comma-separated (press Enter to skip): ')).trim();
  const removeTags = removeInput ? removeInput.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!newName && !addTags.length && !removeTags.length) {
    return undefined;
  }

  return { name: newName, addTags, removeTags };
}

async function applyEdits(
  client: ModelHealthClient,
  activity: Awaited<ReturnType<typeof pickActivity>>,
  edits: { name?: string; addTags: string[]; removeTags: string[] }
) {
  console.log('\nUpdating activity...');
  const updated = await client.updateActivity(activity, edits);

  const updatedTags = updated.tags?.length ? updated.tags.join(', ') : '(none)';
  console.log(`  Name:  ${updated.name ?? updated.id}`);
  console.log(`  Tags:  ${updatedTags}`);
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));
  const subject = await pickSubject(client);
  const activity = await pickActivity(client, subject);

  const edits = await promptEdits(activity);
  if (!edits) {
    console.log('No changes — exiting.');
    return;
  }

  await applyEdits(client, activity, edits);
  console.log('\nDone.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
