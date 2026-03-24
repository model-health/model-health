/**
 * Create session — then go to subject select for this session.
 * Mirrors iOS CreateSessionView.
 */
import { getClient } from '../api.js';

export function render(container, state, { setState, navigate }) {
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;
  const session = state.newSession;

  if (session) {
    // Session just created — show details and QR code before proceeding
    container.innerHTML = `
      <div class="view-header">
        <h1>Session Created</h1>
        <p class="view-subtitle">${escapeHtml(session.name)}</p>
      </div>
      <div class="card">
        <div class="status success">
          <strong>✓ Session created successfully</strong><br>
          ID: ${escapeHtml(session.id)}
        </div>
        ${session.qrcode ? `
          <div style="margin: 20px 0; text-align: center;">
            <h3>Session QR Code</h3>
            <img src="${escapeHtml(session.qrcode)}" alt="Session QR Code"
              style="max-width: 300px; border: 2px solid #e0e0e0; border-radius: 8px; padding: 10px; background: white;" />
            <p style="font-size: 14px; color: #666; margin-top: 10px;">
              Scan this code on <strong>2 or more devices</strong> using the
              <a href="https://apps.apple.com/nl/app/model-health/id6748835391" target="_blank">Model Health companion app</a>
              to link them to this session.<br>
              Supported on all iPhones and iPads from 2018 and newer.
            </p>
          </div>
        ` : ''}
        <button type="button" class="btn primary" id="continue-to-subject">Continue</button>
      </div>
    `;
    container.querySelector('#continue-to-subject')?.addEventListener('click', () => {
      navigate('subject-select', { newSession: session });
    });
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-from-create">← Back</button>
      <h1>New Session</h1>
      <p class="view-subtitle">Each session walks you through camera setup, subject calibration and activity recording and analysis</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
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
