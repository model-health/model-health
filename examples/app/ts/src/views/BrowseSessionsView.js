/**
 * Sessions — the capture workflows activities are recorded under.
 *
 * The narrowest of the four: a subject and an order is everything this list accepts.
 */
import { createBrowseScreen, day } from './browseScreen.js';

export const { render, onEnter } = createBrowseScreen({
  key: 'sessions',
  screen: 'browse-sessions',
  resource: 'sessions',
  title: 'Sessions',
  filters: ['subject'],
  orderBy: ['name', 'createdAt'],
  defaultOrder: '-createdAt',
  headers: ['Name', 'Subject', 'Activities', 'Started'],
  columns: (session) => [
    session.name || session.id,
    session.subject ? `#${session.subject}` : 'none',
    `${session.activitiesCount ?? 0}`,
    day(session.createdAt),
  ],
});
