/**
 * Subject groups — named collections of subjects.
 */
import { createBrowseScreen, day } from './browseScreen.js';

export const { render, onEnter } = createBrowseScreen({
  key: 'groups',
  screen: 'browse-groups',
  resource: 'groups',
  title: 'Subject groups',
  filters: ['search'],
  orderBy: ['name'],
  defaultOrder: 'name',
  headers: ['Name', 'Subjects', 'Activities', 'Last activity'],
  columns: (group) => [
    group.name,
    `${group.subjectCount}`,
    `${group.totalActivities}`,
    day(group.lastActivity),
  ],
});
