/**
 * Record activity — name, type, start/stop, list activities, view results/data.
 * Mirrors iOS RecordActivityView.
 */
import { getClient } from '../api.js';
import { getState, subscribe } from '../state.js';
import { ANALYSIS_TYPES } from '../constants.js';

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function render(container, state, { setState, navigate }) {
  const session = state.session;
  const subject = state.subject;
  const activities = state.activities || [];
  const activityStates = state.activityStates || {};
  const analysisCompleted = state.analysisCompleted || {};
  const selectedActivityType = state.selectedActivityType || ANALYSIS_TYPES[0].value;
  const currentRecording = state.currentRecording;
  const activityName = state.currentActivityName || '';
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  const activityTypeOptions = ANALYSIS_TYPES.map(
    (t) => `<option value="${t.value}" ${t.value === selectedActivityType ? 'selected' : ''}>${escapeHtml(t.label)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-record">← Back</button>
      <h1>Record activity</h1>
      <p class="view-subtitle">${escapeHtml(session?.name || session?.id)} · ${escapeHtml(subject?.name)}</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      <div class="form-group">
        <label>Activity name</label>
        <input type="text" id="activity-name" placeholder="e.g. CMJ" value="${escapeHtml(activityName)}" ${currentRecording ? 'disabled' : ''} />
      </div>
      <div class="form-group">
        <label>Activity type</label>
        <select id="activity-type-select" ${currentRecording ? 'disabled' : ''}>${activityTypeOptions}</select>
      </div>
      ${currentRecording ? `
        <div class="status">⏺ Recording: ${escapeHtml(currentRecording.name || activityName)} — click Stop when done.</div>
        <button type="button" class="btn danger" id="stop-recording">Stop Recording</button>
      ` : `
        <button type="button" class="btn primary" id="start-recording" ${loading ? 'disabled' : ''}>Start Recording</button>
      `}
    </div>
    ${activities.length > 0 ? `
      <h3 style="margin-top: 24px;">Activities</h3>
      <ul class="activity-list">
        ${activities.map((a) => {
          const st = activityStates[a.id] || {};
          const done = !!analysisCompleted[a.id];
          let statusText;
          if (done) statusText = 'Analysis complete';
          else if (st.processingStatus === 'analyzing') statusText = 'Analyzing...';
          else if (st.processingStatus === 'processing') statusText = 'Processing...';
          else if (st.processingStatus === 'uploading') statusText = 'Uploading...';
          else statusText = st.processingStatus || '—';
          return `
            <li class="activity-item" data-activity-id="${escapeHtml(a.id)}">
              <div class="activity-info">
                <strong>${escapeHtml(a.name || a.id)}</strong>
                <span class="muted">${statusText}</span>
              </div>
              <div class="activity-actions">
                <button type="button" class="btn small primary results-btn" data-activity-id="${escapeHtml(a.id)}" ${done ? '' : 'disabled'}>Results</button>
                <button type="button" class="btn small secondary metrics-btn" data-activity-id="${escapeHtml(a.id)}" ${done ? '' : 'disabled'}>Metrics</button>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    ` : ''}
  `;

  container.querySelector('#back-record')?.addEventListener('click', () => navigate('sessions'));

  container.querySelector('#activity-type-select')?.addEventListener('change', (e) => {
    setState({ selectedActivityType: e.target.value });
  });

  container.querySelector('#start-recording')?.addEventListener('click', async () => {
    const name = container.querySelector('#activity-name').value.trim() || 'Activity';
    const client = getClient();
    if (!client || !session)
      return;
    setState({ loadingState: 'loading', errorMessage: null });
    try {
      const activity = await client.startRecording(name, session, { activityType: selectedActivityType });
      setState({
        currentRecording: activity,
        currentActivityName: name,
        loadingState: 'idle',
      });
    } catch (err) {
      setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to start recording' });
    }
  });

  container.querySelector('#stop-recording')?.addEventListener('click', async () => {
    const client = getClient();
    if (!client || !session)
      return;
    setState({ loadingState: 'loading', errorMessage: null });
    try {
      await client.stopRecording(session);
      const activitiesList = await client.activityList(session.id);
      const filtered = (activitiesList || []).filter((a) => a.name !== 'calibration' && a.name !== 'neutral');
      const newStates = { ...getState().activityStates };
      for (const a of filtered) {
        if (!newStates[a.id]) {
          try {
            const status = await client.activityStatus(a);
            newStates[a.id] = { processingStatus: status.type };
          } catch (_) {
            newStates[a.id] = {};
          }
        }
      }
      setState({
        currentRecording: null,
        currentActivityName: '',
        activities: filtered,
        activityStates: newStates,
        loadingState: 'idle',
      });
    } catch (err) {
      setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to stop recording' });
    }
  });

  container.querySelectorAll('.results-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-activity-id');
      const activity = activities.find((a) => a.id === id);
      if (activity) {
        navigate('analysis-result', {
          selectedActivity: activity,
          analysisResult: null,
          analysisResultDataItems: null,
          analysisResultSelectedIndex: 0,
        });
      } else {
        setState({ errorMessage: 'Activity not found.' });
      }
    });
  });

  container.querySelectorAll('.metrics-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-activity-id');
      const activity = activities.find((a) => a.id === id);
      if (activity) {
        navigate('activity-metrics', {
          selectedActivity: activity,
          activityMetricsData: null,
        });
      } else {
        setState({ errorMessage: 'Activity not found.' });
      }
    });
  });
}

export async function onEnter(container, state, ctx) {
  const session = state.session;
  if (!session)
    return;
  const client = getClient();
  if (!client)
    return;
  ctx.setState({ loadingState: 'loading', errorMessage: null });
  try {
    const list = await client.activityList(session.id);
    const activities = (list || []).filter((a) => a.name !== 'calibration' && a.name !== 'neutral');
    const activityStates = {};
    const analysisCompleted = {};
    for (const a of activities) {
      if (a.results?.length > 0) {
        analysisCompleted[a.id] = true;
      }
      try {
        const status = await client.activityStatus(a);
        activityStates[a.id] = { processingStatus: status.type };
        if (status.type === 'analyzing') {
          analysisCompleted[a.id] = false;
        }
      } catch (_) {
        activityStates[a.id] = {};
      }
    }
    ctx.setState({ activities, activityStates, analysisCompleted, loadingState: 'idle' });
  } catch (err) {
    ctx.setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to load activities' });
  }

  // Auto-poll while any activity is still processing or analyzing.
  // Cancelled as soon as the user navigates away.
  let stopped = false;
  const unsubscribe = subscribe((s) => {
    if (s.screen !== 'record-activity') {
      stopped = true;
      unsubscribe();
    }
  });

  const pollId = setInterval(async () => {
    if (stopped) {
      clearInterval(pollId);
      return;
    }
    const s = getState();
    if (s.screen !== 'record-activity') {
      clearInterval(pollId);
      return;
    }
    const acts = s.activities || [];
    if (!acts.length)
      return;
    const hasInProgress = acts.some((a) => {
      if (s.analysisCompleted?.[a.id]) return false;
      return (s.activityStates?.[a.id]?.processingStatus) !== 'failed';
    });
    if (!hasInProgress)
      return;

    // Reload activity list to get fresh results arrays. Used as a fallback
    // completion signal when the 'analyzing' status window is missed between polls.
    let freshById = {};
    try {
      const freshList = await client.activityList(session.id);
      for (const a of (freshList || [])) freshById[a.id] = a;
    } catch (_) {}

    const newStates = { ...s.activityStates };
    const nextCompleted = { ...s.analysisCompleted };
    for (const a of acts) {
      try {
        const prevStatus = (newStates[a.id] || {}).processingStatus;
        const status = await client.activityStatus(a);
        newStates[a.id] = { processingStatus: status.type };
        if (prevStatus === 'analyzing' && status.type === 'ready') {
          nextCompleted[a.id] = true;
        } else if (status.type === 'ready' && !nextCompleted[a.id]) {
          // Analysis may have completed between polls; check results as a fallback.
          if (freshById[a.id]?.results?.length > 0) {
            nextCompleted[a.id] = true;
          }
        }
      } catch (_) {}
    }
    ctx.setState({ activityStates: newStates, analysisCompleted: nextCompleted });
  }, 3000);
}
