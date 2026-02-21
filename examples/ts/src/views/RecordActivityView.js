/**
 * Record activity — name, start/stop, list activities, analyze, view results/data.
 * Mirrors iOS RecordActivityView.
 */
import { getClient } from '../api.js';
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
  const currentRecording = state.currentRecording;
  const activityName = state.currentActivityName || '';
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  const analysisOptions = ANALYSIS_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join('');

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-record">← Back</button>
      <h1>Record Activity</h1>
      <p class="view-subtitle">${escapeHtml(session?.name || session?.id)} · ${escapeHtml(subject?.name)}</p>
    </div>
    ${error ? `<div class="status error">${escapeHtml(error)}</div>` : ''}
    <div class="card">
      <div class="form-group">
        <label>Activity name</label>
        <input type="text" id="activity-name" placeholder="e.g. CMJ Test 1" value="${escapeHtml(activityName)}" ${currentRecording ? 'disabled' : ''} />
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
          const statusText = st.analysisStatus === 'completed' ? 'Analysis complete' : st.analysisStatus === 'processing' ? 'Analyzing...' : st.processingStatus === 'ready' ? 'Ready' : st.processingStatus === 'processing' ? 'Processing...' : st.processingStatus || '—';
          const canAnalyze = st.processingStatus === 'ready' && !st.analysisTask;
          const canViewResults = st.analysisStatus === 'completed';
          return `
            <li class="activity-item" data-activity-id="${escapeHtml(a.id)}">
              <div class="activity-info">
                <strong>${escapeHtml(a.name || a.id)}</strong>
                <span class="muted">${statusText}</span>
              </div>
              <div class="activity-actions">
                <select class="analysis-type-select" data-activity-id="${escapeHtml(a.id)}">${analysisOptions}</select>
                <button type="button" class="btn small secondary refresh-activity" data-activity-id="${escapeHtml(a.id)}">↻</button>
                <button type="button" class="btn small primary analyze-btn" data-activity-id="${escapeHtml(a.id)}" ${canAnalyze ? '' : 'disabled'}>Analyze</button>
                <button type="button" class="btn small primary results-btn" data-activity-id="${escapeHtml(a.id)}" ${canViewResults ? '' : 'disabled'}>Results</button>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    ` : ''}
  `;

  container.querySelector('#back-record')?.addEventListener('click', () => navigate('sessions'));

  container.querySelector('#start-recording')?.addEventListener('click', async () => {
    const name = container.querySelector('#activity-name').value.trim() || 'Activity';
    const client = getClient();
    if (!client || !session)
      return;
    setState({ loadingState: 'loading', errorMessage: null });
    try {
      const trial = await client.record(name, session);
      setState({
        currentRecording: trial,
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
      const newStates = { ...state.activityStates };
      for (const a of filtered) {
        if (!newStates[a.id]) {
          try {
            const status = await client.getStatus(a);
            newStates[a.id] = { processingStatus: status.type, analysisTask: null, analysisStatus: null };
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

  container.querySelectorAll('.refresh-activity').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-activity-id');
      const activity = activities.find((a) => a.id === id);
      if (!activity)
        return;
      const client = getClient();
      try {
        const status = await client.getStatus(activity);
        const st = state.activityStates[id] || {};
        let analysisStatus = st.analysisStatus;
        let resultTags = st.resultTags;
        if (st.analysisTask) {
          const as = await client.getAnalysisStatus(st.analysisTask);
          analysisStatus = as.type;
        } else if (activity.results?.some((r) => r.tag?.startsWith('analysis_function_result'))) {
          analysisStatus = 'completed';
          if (!resultTags?.length && activity.results?.length) resultTags = activity.results.map((r) => r.tag).filter(Boolean);
        }
        setState({
          activityStates: { ...state.activityStates, [id]: { ...st, processingStatus: status.type, analysisStatus, resultTags } },
        });
      } catch (_) {}
    });
  });

  container.querySelectorAll('.analyze-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-activity-id');
      const activity = activities.find((a) => a.id === id);
      const select = container.querySelector(`.analysis-type-select[data-activity-id="${id}"]`);
      const analysisType = select?.value || 'counter_movement_jump';
      const client = getClient();
      if (!client || !activity || !session)
        return;
      try {
        const task = await client.startAnalysis(analysisType, activity, session);
        const st = state.activityStates[id] || {};
        setState({ activityStates: { ...state.activityStates, [id]: { ...st, analysisTask: task, analysisStatus: 'processing' } } });
        let as = await client.getAnalysisStatus(task);
        let attempts = 0;
        while (as.type === 'processing' && attempts < 10) {
          await new Promise((r) => setTimeout(r, 3000));
          as = await client.getAnalysisStatus(task);
          attempts++;
        }
        setState({
          activityStates: {
            ...state.activityStates,
            [id]: {
              ...state.activityStates[id],
              analysisStatus: as.type,
            },
          },
        });
      } catch (err) {
        setState({ errorMessage: err.message || 'Analysis failed' });
      }
    });
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
}

export async function onEnter(container, state, ctx) {
  const session = state.session;
  if (!session)
    return;
  const client = getClient();
  if (!client)
    return;
  if ((state.activities?.length ?? 0) === 0 || state.session?.id !== session.id) {
    ctx.setState({ loadingState: 'loading', errorMessage: null });
    try {
      const list = await client.activityList(session.id);
      const activities = (list || []).filter((a) => a.name !== 'calibration' && a.name !== 'neutral');
      const activityStates = {};
      for (const a of activities) {
        try {
          const status = await client.getStatus(a);
          let analysisStatus = null;
          let resultTags = [];
          if (a.results?.some((r) => r.tag?.startsWith('analysis_function_result'))) {
            analysisStatus = 'completed';
            resultTags = (a.results || []).map((r) => r.tag).filter(Boolean);
          }
          activityStates[a.id] = { processingStatus: status.type, analysisTask: null, analysisStatus, resultTags };
        } catch (_) {
          activityStates[a.id] = {};
        }
      }
      ctx.setState({ activities, activityStates, loadingState: 'idle' });
    } catch (err) {
      ctx.setState({ loadingState: 'idle', errorMessage: err.message || 'Failed to load activities' });
    }
  }
}
