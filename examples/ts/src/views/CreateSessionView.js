/**
 * Create session — then go to subject select for this session.
 * Mirrors iOS CreateSessionView.
 */
import { getClient } from '../api.js';

export function render(container, state, { setState, navigate }) {
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-from-create">← Back</button>
      <h1>New Session</h1>
      <p class="view-subtitle">Create a session, then add a subject and run calibration</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      <p>You will need to:</p>
      <ol class="flow-list">
        <li>Select or create a subject</li>
        <li>Run camera calibration</li>
        <li>Capture neutral pose</li>
      </ol>
      <button type="button" class="btn primary" id="do-create-session" ${loading ? 'disabled' : ''}>
        ${loading ? 'Creating...' : 'Create Session'}
      </button>
    </div>
  `;

  container.querySelector('#back-from-create')?.addEventListener('click', () => navigate('sessions'));
  container.querySelector('#do-create-session')?.addEventListener('click', async () => {
    const client = getClient();
    if (!client)
      return;
    setState({ loadingState: 'loading', errorMessage: null });
    try {
      const session = await client.createSession();
      setState({ newSession: session, loadingState: 'idle' });
      navigate('subject-select', { newSession: session });
    } catch (err) {
      setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to create session' });
    }
  });
}

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
