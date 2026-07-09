/**
 * Model Health TypeScript SDK — update activity metadata.
 * Mirrors examples/python/update_activity.py.
 *
 * Usage:
 *   npx tsx update_activity.ts [<api_key>]
 */

import { ModelHealthService } from '@modelhealth/modelhealth';
import type { Activity } from '@modelhealth/modelhealth';
import {
  loadApiKey, INTERNAL_ACTIVITY_NAMES,
  pickOne, prompt, closePrompts,
} from './_shared.js';

const PAGE_SIZE = 50;

async function loadActivities(
  service: ModelHealthService,
  subject: { id: number }
): Promise<Activity[]> {
  const activities: Activity[] = [];
  let offset = 0;
  while (true) {
    const page = await service.activitiesForSubject(subject.id, offset, PAGE_SIZE, 'updated_at');
    for (const a of page) {
      if (!INTERNAL_ACTIVITY_NAMES.has((a.name ?? '').toLowerCase())) {
        activities.push(a);
      }
    }
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return activities;
}

async function main() {
  const args = process.argv.slice(2);
  console.log('Connecting...');
  const service = new ModelHealthService({ apiKey: loadApiKey(args[0]), autoInit: false });
  await service.init();

  // Subject
  console.log('\nFetching subjects...');
  const subjects = await service.subjectList();

  if (!subjects.length) {
    console.error('No subjects found.');
    process.exit(1);
  }

  console.log();
  const subject = await pickOne(subjects, 'Select subject', s => `${s.name}  (ID ${s.id})`);
  console.log(`  Selected: ${subject.name}`);

  // Activities
  console.log(`\nFetching activities for ${subject.name}...`);
  const activities = await loadActivities(service, subject);

  if (!activities.length) {
    console.error(`No activities found for ${subject.name}.`);
    process.exit(1);
  }

  console.log();
  const activity = await pickOne(
    activities,
    'Select activity',
    a => `${a.name ?? a.id}  [${a.status}]` + (a.activityType ? `  ${a.activityType}` : '')
  );
  console.log(`  Selected: ${activity.name ?? activity.id}`);

  // Update
  console.log('\nUpdate activity (press Enter to keep current value):');
  console.log(`  Current activity type: ${activity.activityType ?? '(none)'}`);
  const currentTags = activity.tags?.length ? activity.tags.join(', ') : '(none)';
  console.log(`  Current tags: ${currentTags}`);

  const newName = (await prompt(`  Name [${activity.name ?? activity.id}]: `)).trim() || undefined;

  const addInput = (await prompt('  Tags to add, comma-separated (press Enter to skip): ')).trim();
  const addTags = addInput ? addInput.split(',').map(t => t.trim()).filter(Boolean) : [];

  const removeInput = (await prompt('  Tags to remove, comma-separated (press Enter to skip): ')).trim();
  const removeTags = removeInput ? removeInput.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!newName && !addTags.length && !removeTags.length) {
    console.log('No changes — exiting.');
    return;
  }

  console.log('\nUpdating activity...');
  const updated = await service.updateActivity(activity, { name: newName, addTags, removeTags });

  const updatedTags = updated.tags?.length ? updated.tags.join(', ') : '(none)';
  console.log(`  Name:  ${updated.name ?? updated.id}`);
  console.log(`  Tags:  ${updatedTags}`);
  console.log('\nDone.');
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
