/**
 * Analysis result — mirrors iOS AnalysisResultDataView.
 * Loads report data and renders it with a PDF viewer and download button.
 */
import { getClient } from '../api.js';

/** Coerce SDK/WASM result data to Uint8Array (may be Array or ArrayBuffer after serialization). */
function toUint8Array(data) {
  if (data instanceof Uint8Array)
    return data;

  if (Array.isArray(data))
    return new Uint8Array(data);

  if (data instanceof ArrayBuffer)
    return new Uint8Array(data);

  return new Uint8Array(0);
}

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function render(container, state, { navigate }) {
  const dataItems = state.analysisResultDataItems || [];
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  if (loading && dataItems.length === 0) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-result">← Back</button>
        <h1>Analysis Data</h1>
      </div>
      <div class="loading-state"><div class="spinner"></div><p>Loading analysis data...</p></div>
    `;
    container.querySelector('#back-result')?.addEventListener('click', () => navigate('record-activity'));
    return;
  }

  if (error && dataItems.length === 0) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-result">← Back</button>
        <h1>Analysis Data</h1>
      </div>
      <div class="status error">${escapeHtml(error)}</div>
    `;
    container.querySelector('#back-result')?.addEventListener('click', () => navigate('record-activity'));
    return;
  }

  if (dataItems.length === 0) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-result">← Back</button>
        <h1>Analysis Data</h1>
      </div>
      <p class="muted">No analysis data available.</p>
    `;
    container.querySelector('#back-result')?.addEventListener('click', () => navigate('record-activity'));
    return;
  }

  const selected = dataItems[0];

  let mainContent = '';
  if (selected?.type === 'report' && selected.data) {
    const bytes = toUint8Array(selected.data);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(blob);
    mainContent = `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button type="button" class="btn primary" id="download-report">Download PDF</button>
        <a class="btn secondary" href="${pdfUrl}" target="_blank">Open in new tab</a>
      </div>
      <iframe id="pdf-frame" src="${pdfUrl}" style="width:100%;height:70vh;border:none;border-radius:4px;"></iframe>
    `;
  } else {
    mainContent = '<p class="muted">No preview for this type.</p>';
  }

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-result">← Back</button>
      <h1>Analysis Data</h1>
    </div>
    <div class="card">
      ${mainContent}
    </div>
  `;

  container.querySelector('#back-result')?.addEventListener('click', () => navigate('record-activity'));

  const reportBtn = container.querySelector('#download-report');
  if (reportBtn && selected?.type === 'report' && selected.data) {
    reportBtn.addEventListener('click', () => {
      const frame = container.querySelector('#pdf-frame');
      const url = frame?.src;
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analysis-report.pdf';
      a.click();
    });
  }
}

export async function onEnter(container, state, ctx) {
  const activity = state.selectedActivity;
  if (!activity)
    return;
  if (state.analysisResultDataItems?.length)
    return;
  const client = getClient();
  if (!client)
    return;
  ctx.setState({ loadingState: 'loading', errorMessage: null });
  try {
    const results = await client.analysisDataForActivity(activity, ['report']);
    if (!results?.length) {
      ctx.setState({ loadingState: 'idle', errorMessage: 'No analysis data in result' });
      return;
    }
    const dataItems = results.map((r) => ({
      type: r.type,
      data: toUint8Array(r.data),
    }));
    ctx.setState({
      analysisResultDataItems: dataItems,
      loadingState: 'idle',
    });
  } catch (err) {
    ctx.setState({ loadingState: 'idle', errorMessage: err?.message || 'Failed to load result' });
  }
}
