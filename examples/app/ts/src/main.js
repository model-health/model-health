/**
 * Model Health example app — API key only, no auth.
 * Starts at session list. Mirrors iOS example structure.
 */
import { initClient, getClient } from './api.js';
import { DEFAULT_API_KEY } from './constants.js';
import { getState, setState, subscribe, navigate } from './state.js';
import { render as renderSessions, onEnter as onEnterSessions } from './views/SessionListView.js';
import { render as renderCreateSession } from './views/CreateSessionView.js';
import { render as renderSubjectSelect, onEnter as onEnterSubjectSelect } from './views/SubjectSelectView.js';
import { render as renderCameraCal } from './views/CameraCalibrationView.js';
import { render as renderNeutralPose } from './views/NeutralPoseView.js';
import { render as renderRecordActivity, onEnter as onEnterRecordActivity } from './views/RecordActivityView.js';
import { render as renderAnalysisResult, onEnter as onEnterAnalysisResult } from './views/AnalysisResultView.js';
import { render as renderMetrics, onEnter as onEnterMetrics } from './views/MetricsView.js';
import { render as renderThreeDView, onEnter as onEnterThreeDView } from './views/ThreeDView.jsx';
import { render as renderBrowseActivities, onEnter as onEnterBrowseActivities } from './views/BrowseActivitiesView.js';
import { render as renderBrowseSubjects, onEnter as onEnterBrowseSubjects } from './views/BrowseSubjectsView.js';
import { render as renderBrowseSessions, onEnter as onEnterBrowseSessions } from './views/BrowseSessionsView.js';
import { render as renderBrowseGroups, onEnter as onEnterBrowseGroups } from './views/BrowseGroupsView.js';

const VIEWS = {
  sessions: { render: renderSessions, onEnter: onEnterSessions },
  'create-session': { render: renderCreateSession },
  'subject-select': { render: renderSubjectSelect, onEnter: onEnterSubjectSelect },
  'camera-calibration': { render: renderCameraCal },
  'neutral-pose': { render: renderNeutralPose },
  'record-activity': { render: renderRecordActivity, onEnter: onEnterRecordActivity },
  'analysis-result': { render: renderAnalysisResult, onEnter: onEnterAnalysisResult },
  'activity-metrics': { render: renderMetrics, onEnter: onEnterMetrics },
  '3d-view': { render: renderThreeDView, onEnter: onEnterThreeDView },
  'browse-activities': { render: renderBrowseActivities, onEnter: onEnterBrowseActivities },
  'browse-subjects': { render: renderBrowseSubjects, onEnter: onEnterBrowseSubjects },
  'browse-sessions': { render: renderBrowseSessions, onEnter: onEnterBrowseSessions },
  'browse-groups': { render: renderBrowseGroups, onEnter: onEnterBrowseGroups },
};

const container = document.getElementById('content');
const ctx = { setState, navigate, getClient };
let previousScreen = null;

function runView(state) {
  const screen = state.screen || 'sessions';
  const view = VIEWS[screen];
  if (!view) {
    container.innerHTML = `<p>Unknown screen: ${screen}</p>`;
    previousScreen = screen;
    return;
  }
  view.render(container, state, ctx);
  const didNavigate = previousScreen !== screen;
  previousScreen = screen;
  if (didNavigate && view.onEnter && typeof view.onEnter === 'function') {
    Promise.resolve(view.onEnter(container, state, ctx)).catch((err) => {
      setState({ errorMessage: err?.message || 'Error' });
    });
  }
}

async function init() {
  try {
    await initClient(DEFAULT_API_KEY);
  } catch (err) {
    container.innerHTML = `
      <div class="view-header">
        <h1>Model Health</h1>
        <p class="view-subtitle">Failed to initialize SDK</p>
      </div>
      <div class="status error">${err?.message || 'Initialization failed'}</div>
    `;
    return;
  }

  subscribe(runView);
  runView(getState());
}

init();
