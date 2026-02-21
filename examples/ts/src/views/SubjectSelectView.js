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
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" id="subject-tags" placeholder="athlete" />
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
      const tagsInput = container.querySelector('#subject-tags').value.trim();
      const params = {
        name,
        height: Number(container.querySelector('#subject-height').value) || 170,
        weight: Number(container.querySelector('#subject-weight').value) || 70,
        birth_year: Number(container.querySelector('#subject-birth-year').value) || 1990,
        sex_at_birth: container.querySelector('#subject-sex').value,
        gender: container.querySelector('#subject-gender').value,
        characteristics: '',
        subject_tags: tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['unimpaired'],
        terms: true,
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
      <p class="view-subtitle">Choose a subject for this session, then run calibration</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      ${subjects.length === 0 && !loading ? `
        <p class="muted">No subjects yet. Create one below.</p>
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
  container.querySelectorAll('.subject-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = Number(el.getAttribute('data-subject-id'));
      const subject = subjects.find((s) => s.id === id);
      if (subject && session) navigate('camera-calibration', { session, subject, newSession: session });
    });
  });
  container.querySelector('#show-create-subject')?.addEventListener('click', () => setState({ subjectCreateMode: true }));
}

export async function onEnter(container, state, ctx) {
  const client = getClient();
  if (!client)
    return;
  if ((state.subjects || []).length === 0 && state.loadingState !== 'loading' && !state.subjectCreateMode) {
    ctx.setState({ loadingState: 'loading', errorMessage: null });
    try {
      const subjects = await client.subjectList();
      ctx.setState({ subjects, loadingState: 'idle' });
    } catch (err) {
      ctx.setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to load subjects' });
    }
  }
}
