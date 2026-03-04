/**
 * Neutral pose calibration — then navigate to record activity.
 */
import { getClient } from '../api.js';

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function render(container, state, { setState, navigate }) {
  const session = state.session || state.newSession;
  const subject = state.subject;
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;
  const heightCm = subject?.height != null ? (subject.height * 100).toFixed(0) : '—';
  const weightKg = subject?.weight != null ? subject.weight.toFixed(0) : '—';

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-neutral">← Back</button>
      <h1>Neutral Pose</h1>
      <p class="view-subtitle">Stand upright, face forward, arms slightly spread</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      <div class="status">
        <strong>Subject:</strong> ${escapeHtml(subject?.name)}<br>
        <strong>Height:</strong> ${heightCm} cm · <strong>Weight:</strong> ${weightKg} kg
      </div>
      <button type="button" class="btn primary" id="start-neutral" ${loading ? 'disabled' : ''}>
        ${loading ? 'Calibrating...' : 'Start Neutral Pose Capture'}
      </button>
      <div id="neutral-status"></div>
    </div>
  `;

  container.querySelector('#back-neutral')?.addEventListener('click', () => navigate('camera-calibration', { session, subject }));

  container.querySelector('#start-neutral')?.addEventListener('click', async () => {
    const client = getClient();
    if (!client || !subject || !session)
      return;
    const statusEl = container.querySelector('#neutral-status');
    setState({ loadingState: 'loading', errorMessage: null });
    try {
      await client.calibrateSubject(subject, session, (status) => {
        if (status.type === 'recording') statusEl.innerHTML = '<div class="status">⏺ Recording neutral pose...</div>';
        else if (status.type === 'uploading') {
          const pct = status.total ? ((status.uploaded / status.total) * 100).toFixed(0) : 0;
          statusEl.innerHTML = `<div class="status">⬆ Uploading: ${status.uploaded}/${status.total} <div class="progress"><div class="progress-fill" style="width:${pct}%">${pct}%</div></div></div>`;
        } else if (status.type === 'processing') {
          const pct = status.percent ? ` ${status.percent}%` : '';
          statusEl.innerHTML = `<div class="status">⚙ Processing${pct}...</div>`;
        } else if (status.type === 'done') statusEl.innerHTML = '<div class="status success">✓ Neutral pose complete!</div>';
      });
      setState({ loadingState: 'idle' });
      setTimeout(() => navigate('record-activity', { session, subject }), 1500);
    } catch (err) {
      setState({ loadingState: 'idle', errorMessage: err.message || 'Neutral pose failed' });
    }
  });
}
