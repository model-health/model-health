/**
 * Activity metrics — mirrors iOS MetricsView.
 * Loads dashboard metrics for the selected activity and displays them grouped
 * by category.
 */
import { getClient } from '../api.js';

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatValue(v) {
  if (!v)
    return '—';
  if (v.type === 'scalar')
    return v.value != null ? String(v.value) : '—';
  if (v.type === 'bilateral') {
    const l = v.left != null ? String(v.left) : '—';
    const r = v.right != null ? String(v.right) : '—';
    return `L ${l} / R ${r}`;
  }
  return '—';
}

export function render(container, state, { navigate }) {
  const metricsData = state.activityMetricsData;
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  if (loading && !metricsData) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-metrics">← Back</button>
        <h1>Activity Metrics</h1>
      </div>
      <div class="loading-state"><div class="spinner"></div><p>Loading metrics...</p></div>
    `;
    container.querySelector('#back-metrics')?.addEventListener('click', () => navigate('record-activity'));
    return;
  }

  if (error && !metricsData) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-metrics">← Back</button>
        <h1>Activity Metrics</h1>
      </div>
      <div class="status error">${escapeHtml(error)}</div>
    `;
    container.querySelector('#back-metrics')?.addEventListener('click', () => navigate('record-activity'));
    return;
  }

  if (!metricsData || !metricsData.groups?.length) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-metrics">← Back</button>
        <h1>Activity Metrics</h1>
      </div>
      <p class="muted">No metrics available for this activity.</p>
    `;
    container.querySelector('#back-metrics')?.addEventListener('click', () => navigate('record-activity'));
    return;
  }

  const groupsHtml = metricsData.groups.map(group => `
    <div class="card" style="margin-bottom:12px;">
      <h2>${escapeHtml(group.name)}</h2>
      ${group.description ? `<p class="view-subtitle">${escapeHtml(group.description)}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 4px;border-bottom:1px solid #e0e0e0;font-size:0.85rem;">Metric</th>
            <th style="text-align:right;padding:6px 4px;border-bottom:1px solid #e0e0e0;font-size:0.85rem;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${group.metrics.map(m => `
            <tr>
              <td style="padding:6px 4px;font-size:0.9rem;">${escapeHtml(m.name)}</td>
              <td style="padding:6px 4px;text-align:right;font-size:0.9rem;font-variant-numeric:tabular-nums;">${escapeHtml(formatValue(m.value))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-metrics">← Back</button>
      <h1>Activity Metrics</h1>
    </div>
    <p class="muted" style="margin-bottom:16px;">Activity ID: ${escapeHtml(metricsData.activityId)}</p>
    ${groupsHtml}
  `;

  container.querySelector('#back-metrics')?.addEventListener('click', () => navigate('record-activity'));
}

export async function onEnter(container, state, ctx) {
  const activity = state.selectedActivity;
  if (!activity)
    return;
  if (state.activityMetricsData?.activityId === activity.id)
    return;
  const client = getClient();
  if (!client)
    return;
  ctx.setState({ loadingState: 'loading', errorMessage: null, activityMetricsData: null });
  try {
    const metrics = await client.activityMetrics(activity.id);
    ctx.setState({ activityMetricsData: metrics, loadingState: 'idle' });
  } catch (err) {
    ctx.setState({ loadingState: 'idle', errorMessage: err?.message || 'Failed to load metrics' });
  }
}
