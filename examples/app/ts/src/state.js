/**
 * Application state and navigation.
 * No auth — SDK uses API key only; app starts at session list.
 */
/** The shape a browse screen starts in. One per screen, so the four never disturb each other. */
function emptyBrowse() {
  return {
    items: [],
    total: null, // how many match, read once and kept
    streamState: 'none', // 'none' | 'open' | 'exhausted' | 'failed'
    busy: false,
    error: null,
    refs: {}, // the subjects/sessions/groups this screen's pickers are built from
    refsLoaded: false,
  };
}

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
  subjectSearch: '', // what the subject list was last filtered by, on the server
  // Record activity
  activities: [],
  activityStates: {}, // id -> { processingStatus }
  selectedActivityType: 'counter_movement_jump', // activity type for the next recording
  analysisCompleted: {}, // id -> true when analysis has completed for this activity
  currentRecording: null,
  usage: null, // the account's plan state, read when the record screen opens
  currentActivityName: '',
  // Selected activity for results/data views
  selectedActivity: null,
  selectedResultTag: null,
  analysisResult: null,
  /** Analysis result data items (metrics, report, etc.) — like iOS AnalysisResultDataView */
  analysisResultDataItems: null,
  analysisResultSelectedIndex: 0,
  activityDataItems: null,
  // The open sequence itself is not here — it has a lifetime and something has to release it,
  // which each screen owns. Only what a screen draws lives in state.
  activitiesBrowse: emptyBrowse(),
  subjectsBrowse: emptyBrowse(),
  sessionsBrowse: emptyBrowse(),
  groupsBrowse: emptyBrowse(),
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
