/**
 * Subjects — the people activities are recorded for.
 */
import { createBrowseScreen, day } from './browseScreen.js';

export const { render, onEnter } = createBrowseScreen({
  key: 'subjects',
  screen: 'browse-subjects',
  resource: 'subjects',
  title: 'Subjects',
  filters: [
    'search', 'dates', 'groups', 'tags', 'createdBy', 'activityType', 'activityComplete', 'session',
  ],
  orderBy: ['name', 'createdAt', 'updatedAt'],
  defaultOrder: 'name',
  headers: ['Name', 'Id', 'Activities', 'Added'],
  columns: (subject) => [
    subject.name,
    `#${subject.id}`,
    `${subject.activityCount ?? 0}`,
    day(subject.createdAt),
  ],
});
