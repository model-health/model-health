/**
 * Session list — mirrors iOS SessionListView.
 */
import { getClient } from '../api.js';

export function render(container, state, { setState, navigate }) {
  const loading = state.loadingState === 'loading';
  const error = state.loadingState === 'error' && state.errorMessage;
  const sessions = state.sessions || [];
  const hasSessions = sessions.length > 0;

  container.innerHTML = `
    <div class="view-header">
      <h1>Sessions</h1>
      <p class="view-subtitle">A session scopes a movement capture workflow. Create one or load an existing one to start recording activities.</p>
    </div>
    <div class="toolbar">
      <button type="button" class="btn primary" id="create-session-btn" ${loading ? 'disabled' : ''}>
        New Session
      </button>
    </div>
    ${loading ? `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading sessions...</p>
      </div>
    ` : error ? `
      <div class="error-state">
        <p class="error-message">${escapeHtml(error)}</p>
        <button type="button" class="btn secondary" id="retry-sessions">Try Again</button>
      </div>
    ` : !hasSessions ? `
      <div class="empty-state">
        <p>No sessions yet</p>
        <p class="muted">Create your first session to get started</p>
      </div>
    ` : `
      <ul class="session-list">
        ${sessions.map((s) => {
          const subject = (state.subjects || []).find((sub) => sub.id === s.subject);
          const canOpen = subject != null;
          return `
            <li class="session-item" data-session-id="${escapeHtml(s.id)}" data-can-open="${canOpen}">
              <div class="session-item-main">
                <strong>${escapeHtml(s.id)}</strong>
                <span class="muted">${escapeHtml(s.name)}</span>
              </div>
              ${canOpen ? '<span class="session-arrow">→</span>' : ''}
            </li>
          `;
        }).join('')}
      </ul>
    `}
  `;

  container.querySelector('#create-session-btn')?.addEventListener('click', () => {
    navigate('create-session', { newSession: null });
  });
  container.querySelector('#retry-sessions')?.addEventListener('click', () => loadSessions(setState, navigate));
  container.querySelectorAll('.session-item[data-can-open="true"]').forEach((el) => {
    el.addEventListener('click', () => {
      const sessionId = el.getAttribute('data-session-id');
      const session = sessions.find((s) => s.id === sessionId);
      const subject = (state.subjects || []).find((s) => s.id === session.subject);
      if (session && subject) navigate('record-activity', { session, subject, activities: [], activityStates: {} });
    });
  });
}

async function loadSessions(setState, navigate) {
  const client = getClient();
  if (!client)
    return;
  setState({ loadingState: 'loading', errorMessage: null });
  try {
    const [sessions, subjects] = await Promise.all([
      client.sessionList(),
      client.subjectList(),
    ]);
    const withSubject = (sessions || []).filter((s) => s.subject != null);
    setState({
      sessions: withSubject,
      subjects: subjects || [],
      loadingState: 'idle',
      errorMessage: null,
    });
  } catch (err) {
    setState({
      loadingState: 'error',
      errorMessage: err.message || 'Failed to load sessions',
    });
  }
}

export async function onEnter(container, state, ctx) {
  const { setState } = ctx;
  if (state.loadingState === 'loading')
    return;
  await loadSessions(setState, ctx.navigate);
}

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
