/**
 * Analysis result — mirrors iOS AnalysisResultDataView.
 * Loads metrics + report, picker to switch, metrics grid + report PDF download.
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

export function render(container, state, { setState, navigate }) {
  const result = state.analysisResult;
  const dataItems = state.analysisResultDataItems || [];
  const selectedIndex = Math.min(state.analysisResultSelectedIndex ?? 0, Math.max(0, dataItems.length - 1));
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  if (loading && !result && dataItems.length === 0) {
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

  const labels = dataItems.map((r) => (r.result_data_type === 'metrics' ? 'Metrics' : r.result_data_type === 'report' ? 'Report' : 'Data'));
  const selected = dataItems[selectedIndex];
  const isMetrics = selected?.result_data_type === 'metrics';

  let mainContent = '';
  if (isMetrics && result) {
    mainContent = `
      <pre class="metrics-json">${escapeHtml(JSON.stringify(result, null, 2))}</pre>
    `;
  } else if (selected?.result_data_type === 'report' && selected.data) {
    mainContent = `
      <p class="muted">PDF report</p>
      <button type="button" class="btn primary" id="download-report">Report</button>
    `;
  } else {
    mainContent = '<p class="muted">No preview for this type.</p>';
  }

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-result">← Back</button>
      <h1>Analysis Data</h1>
    </div>
    ${dataItems.length > 1 ? `
      <div class="analysis-result-picker">
        ${dataItems.map((_, i) => `
          <button type="button" class="btn small ${i === selectedIndex ? 'primary' : 'secondary'}" data-index="${i}">${labels[i]}</button>
        `).join('')}
      </div>
    ` : ''}
    <div class="card">
      ${result && isMetrics ? `<h2>${escapeHtml(result.analysis_title || 'Metrics')}</h2><p class="view-subtitle">${escapeHtml(result.analysis_description || '')}</p>` : ''}
      ${mainContent}
    </div>
  `;

  container.querySelector('#back-result')?.addEventListener('click', () => navigate('record-activity'));

  container.querySelectorAll('.analysis-result-picker [data-index]').forEach((btn) => {
    btn.addEventListener('click', () => setState({ analysisResultSelectedIndex: Number(btn.getAttribute('data-index')) }));
  });

  const reportBtn = container.querySelector('#download-report');
  if (reportBtn && selected?.result_data_type === 'report' && selected.data) {
    reportBtn.addEventListener('click', () => {
      const bytes = toUint8Array(selected.data);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'analysis-report.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
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
    const results = await client.downloadActivityAnalysisResultData(activity, ['metrics', 'report']);
    if (!results?.length) {
      ctx.setState({ loadingState: 'idle', errorMessage: 'No analysis data in result' });
      return;
    }
    const dataItems = results.map((r) => ({
      result_data_type: r.result_data_type,
      data: toUint8Array(r.data),
    }));
    const metricsEntry = dataItems.find((r) => r.result_data_type === 'metrics');
    let analysisResult = null;
    if (metricsEntry?.data?.length) {
      const text = new TextDecoder().decode(metricsEntry.data);
      analysisResult = JSON.parse(text);
    }
    ctx.setState({
      analysisResultDataItems: dataItems,
      analysisResult,
      analysisResultSelectedIndex: 0,
      loadingState: 'idle',
    });
  } catch (err) {
    ctx.setState({ loadingState: 'idle', errorMessage: err?.message || 'Failed to load result' });
  }
}
