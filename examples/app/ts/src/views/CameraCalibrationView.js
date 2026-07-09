/**
 * Camera calibration — checkerboard config and status callback.
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

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-cal">← Back</button>
      <h1>Calibrate cameras</h1>
      <p class="view-subtitle">Use a checkerboard pattern. <a href="https://sdk.modelhealth.io/docs/guides/camera-calibration" target="_blank">Learn more</a></p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      <div class="form-group">
        <label>Rows (internal corners)</label>
        <input type="number" id="cb-rows" value="4" />
      </div>
      <div class="form-group">
        <label>Columns (internal corners)</label>
        <input type="number" id="cb-columns" value="5" />
      </div>
      <div class="form-group">
        <label>Square size (mm)</label>
        <input type="number" id="cb-size" value="35" />
      </div>
      <div class="form-group">
        <label>Placement</label>
        <select id="cb-placement">
          <option value="perpendicular">Perpendicular</option>
          <option value="parallel">Parallel</option>
        </select>
      </div>
      <button type="button" class="btn primary" id="start-camera-cal" ${loading ? 'disabled' : ''}>
        ${loading ? 'Calibrating...' : 'Start Calibration'}
      </button>
      <div id="calibration-status"></div>
    </div>
  `;

  container.querySelector('#back-cal')?.addEventListener('click', () => navigate('subject-select', { newSession: session }));

  container.querySelector('#start-camera-cal')?.addEventListener('click', async () => {
    const client = getClient();
    if (!client || !session)
      return;
    const details = {
      rows: parseInt(container.querySelector('#cb-rows').value, 10) || 4,
      columns: parseInt(container.querySelector('#cb-columns').value, 10) || 5,
      square_size: parseInt(container.querySelector('#cb-size').value, 10) || 35,
      placement: container.querySelector('#cb-placement').value || 'perpendicular',
    };
    const statusEl = container.querySelector('#calibration-status');
    setState({ loadingState: 'loading', errorMessage: null });
    try {
      await client.calibrateCamera(session, details, (status) => {
        if (status.type === 'recording') statusEl.innerHTML = '<div class="status">⏺ Recording checkerboard views...</div>';
        else if (status.type === 'uploading') {
          const pct = status.total ? ((status.uploaded / status.total) * 100).toFixed(0) : 0;
          statusEl.innerHTML = `<div class="status">⬆ Uploading: ${status.uploaded}/${status.total} <div class="progress"><div class="progress-fill" style="width:${pct}%">${pct}%</div></div></div>`;
        } else if (status.type === 'processing') statusEl.innerHTML = '<div class="status">⚙ Processing...</div>';
        else if (status.type === 'done') statusEl.innerHTML = '<div class="status success">✓ Camera calibration complete!</div>';
      });
      setState({ loadingState: 'idle' });
      setTimeout(() => navigate('neutral-pose', { session, subject }), 1500);
    } catch (err) {
      setState({ loadingState: 'idle', errorMessage: err.message || 'Calibration failed' });
    }
  });
}
