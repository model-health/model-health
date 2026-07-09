/**
 * Application state and navigation.
 * No auth — SDK uses API key only; app starts at session list.
 */
const initialState = {
  screen: 'sessions',
  sessions: [],
  subjects: [],
  session: null,
  subject: null,
  loadingState: 'idle', // 'idle' | 'loading' | 'error'
  errorMessage: null,
  // Create-session flow (newSession set after createSession())
  newSession: null,
  subjectCreateMode: false, // true when showing create-subject form inside subject-select
  // Record activity
  activities: [],
  activityStates: {}, // id -> { processingStatus }
  selectedActivityType: 'counter_movement_jump', // activity type for the next recording
  analysisCompleted: {}, // id -> true when analysis has completed for this activity
  currentRecording: null,
  currentActivityName: '',
  // Selected activity for results/data views
  selectedActivity: null,
  selectedResultTag: null,
  analysisResult: null,
  /** Analysis result data items (metrics, report, etc.) — like iOS AnalysisResultDataView */
  analysisResultDataItems: null,
  analysisResultSelectedIndex: 0,
  activityDataItems: null,
};

let state = { ...initialState };
const listeners = new Set();

function getState() {
  return state;
}

function setState(partial) {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn(state));
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Navigate to a screen and optionally set context (session, subject, etc.).
 */
function navigate(screen, context = {}) {
  setState({
    screen,
    errorMessage: null,
    ...context,
  });
}

export { getState, setState, subscribe, navigate, initialState };
