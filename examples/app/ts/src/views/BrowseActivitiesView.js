/**
 * Activities — the list with the most to filter by, and usually the only one long enough to
 * watch arrive a piece at a time.
 */
import { createBrowseScreen, day } from './browseScreen.js';

export const { render, onEnter } = createBrowseScreen({
  key: 'activities',
  screen: 'browse-activities',
  resource: 'activities',
  title: 'Activities',
  filters: [
    'search', 'subject', 'calibrationSession', 'activityType', 'dates',
    'tags', 'createdBy', 'onlyCompleted', 'excludeCalibration', 'excludeAnalysisError',
  ],
  orderBy: ['createdAt', 'status', 'createdBy', 'activityType'],
  defaultOrder: '-createdAt',
  headers: ['Name', 'Type', 'Analysis', 'Recorded'],
  columns: (activity) => [
    activity.name || activity.id,
    // Whatever the server reported, including a type this SDK build does not itself name.
    activity.activityType?.displayName,
    activity.analysisStatus || activity.status,
    day(activity.createdAt),
  ],
});
