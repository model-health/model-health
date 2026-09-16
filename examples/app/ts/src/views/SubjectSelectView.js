/**
 * Subject select for new-session flow — select or create subject, then camera calibration.
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
  const session = state.newSession || state.session;
  const subjects = state.subjects || [];
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;
  const showCreateForm = state.subjectCreateMode;

  if (showCreateForm) {
    container.innerHTML = `
      <div class="view-header">
        <button type="button" class="btn back" id="back-create-subject">← Back</button>
        <h1>Create Subject</h1>
      </div>
      ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
      <div class="card create-subject-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="subject-name" placeholder="Name" />
        </div>
        <div class="form-group">
          <label>Height (cm)</label>
          <input type="number" id="subject-height" placeholder="170" />
        </div>
        <div class="form-group">
          <label>Weight (kg)</label>
          <input type="number" id="subject-weight" placeholder="70" />
        </div>
        <div class="form-group">
          <label>Birth year</label>
          <input type="number" id="subject-birth-year" placeholder="1990" />
        </div>
        <div class="form-group">
          <label>Sex at birth</label>
          <select id="subject-sex"><option value="woman">Woman</option><option value="man">Man</option><option value="intersex">Intersex</option><option value="not_listed">Not listed</option><option value="no_response">Prefer not to say</option></select>
        </div>
        <div class="form-group">
          <label>Gender</label>
          <select id="subject-gender"><option value="woman">Woman</option><option value="man">Man</option><option value="transgender">Transgender</option><option value="non_binary">Non-binary</option><option value="no_response">Prefer not to say</option></select>
        </div>
        <button type="button" class="btn primary" id="submit-create-subject" ${loading ? 'disabled' : ''}>Create</button>
        <button type="button" class="btn secondary" id="cancel-create-subject">Cancel</button>
      </div>
    `;
    container.querySelector('#back-create-subject')?.addEventListener('click', () => setState({ subjectCreateMode: false }));
    container.querySelector('#cancel-create-subject')?.addEventListener('click', () => setState({ subjectCreateMode: false }));
    container.querySelector('#submit-create-subject')?.addEventListener('click', async () => {
      const name = container.querySelector('#subject-name').value.trim();
      if (!name)
        return setState({ errorMessage: 'Name is required' });
      const client = getClient();
      if (!client)
        return;
      const params = {
        name,
        height: Number(container.querySelector('#subject-height').value) || 170,
        weight: Number(container.querySelector('#subject-weight').value) || 70,
        birthYear: Number(container.querySelector('#subject-birth-year').value) || 1990,
        sexAtBirth: container.querySelector('#subject-sex').value,
        gender: container.querySelector('#subject-gender').value,
        characteristics: '',
      };
      setState({ loadingState: 'loading', errorMessage: null });
      try {
        const subject = await client.createSubject(params);
        const newSubjects = [...(state.subjects || []), subject];
        setState({ subjects: newSubjects, loadingState: 'idle', subjectCreateMode: false });
        if (session) navigate('camera-calibration', { session, subject, newSession: session });
      } catch (err) {
        setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to create subject' });
      }
    });
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-subject">← Back</button>
      <h1>Select Subject</h1>
      <p class="view-subtitle">Select a subject to continue, or add a new one</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      <div class="form-group">
        <label for="subject-search">Search</label>
        <input type="text" id="subject-search" placeholder="Search by name"
               value="${escapeHtml(state.subjectSearch || '')}" ${loading ? 'disabled' : ''} />
      </div>
      ${subjects.length === 0 && !loading ? `
        <p class="muted">${state.subjectSearch ? 'No subject matches that name.' : 'No subjects yet. Create one below.'}</p>
      ` : `
        <ul class="subject-list">
          ${subjects.map((s) => `
            <li class="subject-item" data-subject-id="${s.id}">
              <strong>${escapeHtml(s.name)}</strong>
              <span class="muted">${s.height ? (s.height * 100).toFixed(0) + ' cm' : ''} ${s.weight ? s.weight + ' kg' : ''}</span>
            </li>
          `).join('')}
        </ul>
      `}
      <hr />
      <button type="button" class="btn secondary" id="show-create-subject" ${loading ? 'disabled' : ''}>Create New Subject</button>
    </div>
  `;

  container.querySelector('#back-subject')?.addEventListener('click', () => navigate('sessions'));
  // The server does the searching: `search` narrows the list before it is sent, so what arrives
  // is already the answer. Committed on Enter or on leaving the field, not per keystroke.
  container.querySelector('#subject-search')?.addEventListener('change', (event) => {
    loadSubjects(setState, event.target.value.trim());
  });
  container.querySelectorAll('.subject-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = Number(el.getAttribute('data-subject-id'));
      const subject = subjects.find((s) => s.id === id);
      if (subject && session) navigate('camera-calibration', { session, subject, newSession: session });
    });
  });
  container.querySelector('#show-create-subject')?.addEventListener('click', () => setState({ subjectCreateMode: true }));
}

/**
 * Reads the subjects matching `search`, or every subject when it is empty.
 *
 * `list(...)` hands back a sequence rather than an array; `all()` collects it, which is what a
 * picker this size wants.
 */
async function loadSubjects(setState, search) {
  const client = getClient();
  if (!client)
    return;
  setState({ loadingState: 'loading', errorMessage: null, subjectSearch: search });
  try {
    const subjects = await client.subjects.list({ search: search || undefined }).all();
    setState({ subjects, loadingState: 'idle' });
  } catch (err) {
    setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to load subjects' });
  }
}

export async function onEnter(container, state, ctx) {
  if ((state.subjects || []).length === 0 && state.loadingState !== 'loading' && !state.subjectCreateMode) {
    await loadSubjects(ctx.setState, state.subjectSearch || '');
  }
}
