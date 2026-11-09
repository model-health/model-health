/**
 * Activity results — fetches what an activity produced and offers each result as a download.
 * Mirrors the iOS ActivityResultsView.
 *
 * Each result is asked for on its own, so one the activity does not have is listed with its
 * reason while the others still arrive.
 */
import { getClient } from '../api.js';
import { setState } from '../state.js';

/** Every result type, with the format and media type its bytes come in. */
const ARTIFACTS = [
  { type: 'metrics', mime: 'application/json' },
  { type: 'report', mime: 'application/pdf' },
  { type: 'data', mime: 'application/zip' },
  { type: 'kinematics_csv', mime: 'text/csv' },
];

/** What the screen shows before anything has been fetched. */
export function emptyResults() {
  return { busy: false, error: null, files: null, problems: [] };
}

function escapeHtml(value) {
  if (value == null)
    return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

export function render(container, state, { navigate }) {
  const activity = state.resultsActivity;
  const results = state.activityResults || emptyResults();

  if (!activity) {
    container.innerHTML = '<p class="muted">No activity selected.</p>';
    return;
  }

  const files = (results.files || []).map((file) => `
    <li class="browse-row results-row">
      <span class="browse-cell">${escapeHtml(file.name)}</span>
      <span class="browse-cell">${file.bytes.length} bytes</span>
      <span class="browse-cell">
        <button type="button" class="btn small primary" data-save="${escapeHtml(file.type)}">Download</button>
      </span>
    </li>
  `).join('');
  const problems = results.problems.map((problem) => `
    <li class="browse-row results-row">
      <span class="browse-cell">${escapeHtml(problem.type)}</span>
      <span class="browse-cell muted">${escapeHtml(problem.message)}</span>
    </li>
  `).join('');

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="results-back">← Back</button>
      <h1>Results</h1>
    </div>
    <div class="card">
      <p><strong>${escapeHtml(activity.name || activity.id)}</strong></p>
      <p class="muted">Status: ${escapeHtml(activity.status)} · Has results: ${activity.hasResults ? 'yes' : 'no'}</p>
      <button type="button" class="btn primary" id="results-fetch" ${results.busy ? 'disabled' : ''}>
        Fetch into memory
      </button>
      <p class="muted">Asks for metrics, the report, the data bundle and kinematics.</p>
    </div>
    ${results.busy ? '<div class="loading-state"><div class="spinner"></div><p>Fetching…</p></div>' : ''}
    ${results.error ? `<div class="status error">${escapeHtml(results.error)}</div>` : ''}
    ${files ? `<h2>Fetched</h2><ul class="browse-list">${files}</ul>` : ''}
    ${problems ? `<h2>Not fetched</h2><ul class="browse-list">${problems}</ul>` : ''}
  `;

  container.querySelector('#results-back')?.addEventListener('click', () => navigate('browse-activities'));
  container.querySelector('#results-fetch')?.addEventListener('click', () => fetchAll(activity));
  container.querySelectorAll('[data-save]').forEach((button) => {
    const file = results.files.find((candidate) => candidate.type === button.dataset.save);
    button.addEventListener('click', () => save(file));
  });
}

async function fetchAll(activity) {
  setState({ activityResults: { ...emptyResults(), busy: true } });

  try {
    const client = getClient();
    const fetched = await client.fetchArtifacts(activity, ARTIFACTS.map((artifact) => artifact.type));
    const files = ARTIFACTS
      .filter(({ type }) => fetched.data[type])
      .map(({ type, mime }) => ({
        type,
        mime,
        bytes: fetched.data[type],
        name: client.artifactFileName(activity, type),
      }));
    const problems = ARTIFACTS
      .filter(({ type }) => fetched.errors[type])
      .map(({ type }) => {
        const error = fetched.errors[type];
        return { type, message: `${error.name}: ${error.message}` };
      });
    setState({ activityResults: { ...emptyResults(), files, problems } });
  } catch (err) {
    setState({ activityResults: { ...emptyResults(), error: err?.message || String(err) } });
  }
}

/** Hands the bytes to the browser as a file. */
function save(file) {
  const url = URL.createObjectURL(new Blob([file.bytes], { type: file.mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
