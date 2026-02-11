import { ModelHealthService } from '@modelhealth/sdk';

// Application state
const state = {
  currentStep: 1,
  client: null,
  sessions: [],
  session: null,
  sessionIsNew: false,
  subjects: [],
  subject: null,
  creatingSubject: false,
  trial: null,
  analysisTask: null,
  results: null,
  isProcessing: false
};

const codeExamples = {
  1: `// Step 1: Initialize SDK with API Key
const client = new ModelHealthService({
  apiKey: "your-api-key-here"
});
await client.init();

const isAuth = await client.isAuthenticated();
console.log('Authenticated:', isAuth); // true`,

  2: `// Step 2: Select or Create Session
const sessions = await client.sessionList();
console.log('Available sessions:', sessions.length);

// Select existing session
const session = sessions[0];

// OR create new session
const newSession = await client.createSession();
console.log('Session created:', newSession.id);`,

  3: `// Step 3: Select Subject
const subjects = await client.subjectList();
console.log('Available subjects:', subjects.length);

// Select a subject from the list
const subject = subjects[0];`,

  4: `// Step 4: Camera Calibration
await client.calibrateCamera(
  session,
  {
    rows: 4,
    columns: 5,
    square_size: 35,
    placement: "perpendicular"
  },
  (status) => {
    console.log('Calibration status:', status);
    // status.type: 'recording' | 'uploading' | 'processing' | 'done'
  }
);`,

  5: `// Step 5: Neutral Pose Calibration
await client.calibrateNeutralPose(
  subject,
  session,
  (status) => {
    console.log('Neutral pose status:', status);
  }
);`,

  6: `// Step 6: Record Trial
const trial = await client.record("cmj-test-1", session);

// Perform movement...

await client.stopRecording(session);

// Poll for processing completion
let status = await client.getStatus(trial);
while (status.type !== 'ready' && status.type !== 'failed') {
  await new Promise(resolve => setTimeout(resolve, 2000));
  status = await client.getStatus(trial);
}`,

  7: `// Step 7: Start Analysis
const task = await client.startAnalysis(
  "counter_movement_jump",
  trial,
  session
);

// Poll for completion
let analysisStatus = await client.getAnalysisStatus(task);
while (analysisStatus.type === 'processing') {
  await new Promise(resolve => setTimeout(resolve, 3000));
  analysisStatus = await client.getAnalysisStatus(task);
}`,

  8: `// Step 8: Download Results
const result = await client.downloadAnalysisResult(
  trial,
  analysisStatus.result_tags[0]
);

// Access metrics
const jumpHeight = result.metrics['00_jump_height_COM'];
console.log('Jump height:', jumpHeight.value.value, 'cm');

// Export data
const json = JSON.stringify(result, null, 2);
const csv = convertToCSV(result.metrics);`
};

// Logging utility
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logElement = document.getElementById('log');
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✓' : '→';
  logElement.textContent += `[${timestamp}] ${prefix} ${message}\n`;
  logElement.scrollTop = logElement.scrollHeight;
}

// Update progress bar
function updateProgress() {
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNum < state.currentStep) {
      step.classList.add('completed');
    } else if (stepNum === state.currentStep) {
      step.classList.add('active');
    }
  });
}

async function loadSessions() {
  log('Calling client.sessionList()');

  try {
    const sessions = await state.client.sessionList();
    state.sessions = sessions;
    log(`Loaded ${sessions.length} sessions`, 'success');
    renderStep1();
  } catch (error) {
    log(`Failed to load sessions: ${error.message}`, 'error');
    state.sessions = [];
    renderStep1();
  }
}

async function handleSelectSession(sessionId) {
  log(`Selecting existing session ID: ${sessionId}`);

  const session = state.sessions.find(s => s.id === sessionId);
  if (session) {
    state.session = session;
    state.sessionIsNew = false;
    log(`Session selected: ${session.name}`, 'success');
    log('Skipping calibration steps (2-4) - using existing calibration');
    renderStep1();
  } else {
    log(`Session not found: ${sessionId}`, 'error');
  }
}

// Render functions for each step
function renderStep1() {
  const content = document.getElementById('content');

  if (state.session) {
    // Session selected - show different message based on how it was obtained
    const message = state.sessionIsNew
      ? 'New session created. Proceed with calibration.'
      : 'Existing session selected. Calibration already complete.';

    content.innerHTML = `
      <div class="card">
        <h2>Step 1: Session ${state.sessionIsNew ? 'Created' : 'Selected'}</h2>
        
        <div class="status success">
          <strong>✓ ${message}</strong><br>
          ID: ${state.session.id}<br>
          Name: ${state.session.name}
        </div>
        
        ${state.session.qrcode ? `
          <div style="margin: 20px 0; text-align: center;">
            <h3>Session QR Code</h3>
            <img src="${state.session.qrcode}" alt="Session QR Code" style="max-width: 300px; border: 2px solid #e0e0e0; border-radius: 8px; padding: 10px; background: white;" />
            <p style="font-size: 14px; color: #666; margin-top: 10px;">Scan this code to link devices to this session</p>
          </div>
        ` : ''}
        
        <button onclick="nextStep()" class="secondary">Continue</button>
      </div>
    `;
  } else if (state.sessions && state.sessions.length > 0) {
    // Show session list
    const sessionOptions = state.sessions.map(session => `
      <div class="session-option" style="padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 5px; cursor: pointer;" onclick="handleSelectSession('${session.id}')">
        <strong>${session.name}</strong><br>
        <small>
          ID: ${session.id} | 
          Trials: ${session.trials ? session.trials.length : 0}
        </small>
      </div>
    `).join('');

    content.innerHTML = `
      <div class="card">
        <h2>Step 1: Select Session</h2>
        <p>Choose an existing session (skip calibration) or create a new one.</p>
        
        <div style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;">
          ${sessionOptions}
        </div>
        
        <button onclick="handleCreateSession()" ${state.isProcessing ? 'disabled' : ''}>
          ${state.isProcessing ? 'Creating...' : 'Create New Session (requires calibration)'}
        </button>
      </div>
    `;
  } else {
    // Loading sessions
    content.innerHTML = `
      <div class="card">
        <h2>Step 1: Loading Sessions...</h2>
        <p>Fetching available sessions...</p>
      </div>
    `;
    loadSessions();
  }
}

function renderStep2() {
  const content = document.getElementById('content');

  if (state.subject) {
    // Subject selected
    content.innerHTML = `
      <div class="card">
        <h2>Step 2: Select Subject</h2>
        <p>Subject selected for analysis.</p>
        
        <div class="status success">
          <strong>✓ Subject Selected</strong><br>
          ID: ${state.subject.id}<br>
          Name: ${state.subject.name}<br>
          ${state.subject.height ? `Height: ${(state.subject.height * 100).toFixed(0)} cm` : 'Height: Not specified'}, 
          ${state.subject.weight ? `Weight: ${state.subject.weight.toFixed(0)} kg` : 'Weight: Not specified'}
        </div>
        <button onclick="nextStep()" class="secondary">Continue to Next Step</button>
      </div>
    `;
  } else if (state.creatingSubject) {
    // Show create subject form
    content.innerHTML = `
      <div class="card">
        <h2>Step 2: Create New Subject</h2>
        
        <div class="form-group">
          <label for="subject-name">Full Name:</label>
          <input type="text" id="subject-name" placeholder="Jane Doe" />
        </div>
        
        <div class="form-group">
          <label for="subject-height">Height (cm):</label>
          <input type="number" id="subject-height" />
        </div>
        
        <div class="form-group">
          <label for="subject-weight">Weight (kg):</label>
          <input type="number" id="subject-weight" />
        </div>
        
        <div class="form-group">
          <label for="subject-birth-year">Birth Year:</label>
          <input type="number" id="subject-birth-year" />
        </div>
        
        <div class="form-group">
          <label for="subject-sex">Sex at Birth:</label>
          <select id="subject-sex">
            <option value="woman">Woman</option>
            <option value="man">Man</option>
            <option value="intersex">Intersex</option>
            <option value="not_listed">Not Listed</option>
            <option value="no_response">Prefer Not to Say</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="subject-gender">Gender:</label>
          <select id="subject-gender">
            <option value="woman">Woman</option>
            <option value="man">Man</option>
            <option value="transgender">Transgender</option>
            <option value="non_binary">Non-Binary</option>
            <option value="no_response">Prefer Not to Say</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="subject-tags">Tags (comma-separated):</label>
          <input type="text" id="subject-tags" placeholder="unimpaired" />
        </div>
        
        <button onclick="handleCreateSubject()" ${state.isProcessing ? 'disabled' : ''}>
          ${state.isProcessing ? 'Creating...' : 'Create Subject'}
        </button>
      </div>
    `;
  } else if (state.subjects.length > 0) {
    // Show subject list
    const subjectOptions = state.subjects.map(subject => `
      <div class="subject-option" style="padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 5px; cursor: pointer;" onclick="handleSelectSubject(${subject.id})">
        <strong>${subject.name}</strong><br>
        <small>
          ID: ${subject.id} | 
          ${subject.height ? `Height: ${(subject.height * 100).toFixed(0)} cm` : 'No height'} | 
          ${subject.weight ? `Weight: ${subject.weight.toFixed(0)} kg` : 'No weight'} |
          ${subject.age ? `Age: ${subject.age}` : subject.birth_year ? `Birth: ${subject.birth_year}` : 'No age'}
        </small>
      </div>
    `).join('');

    content.innerHTML = `
      <div class="card">
        <h2>Step 2: Select Subject</h2>
        <p>Choose an existing subject or create a new one.</p>
        
        <div style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;">
          ${subjectOptions}
        </div>
        
        <button onclick="showCreateSubject()">Create New Subject</button>
      </div>
    `;
  } else {
    // Loading subjects
    content.innerHTML = `
      <div class="card">
        <h2>Step 2: Loading Subjects...</h2>
        <p>Fetching available subjects...</p>
      </div>
    `;
    loadSubjects();
  }
}

function renderStep3() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 3: Camera Calibration</h2>
      <p>Calibrate cameras using a checkerboard pattern. Show the checkerboard from multiple angles.</p>
      
      <div class="form-group">
        <label for="cb-rows">Rows (internal corners):</label>
        <input type="number" id="cb-rows" value="4" />
      </div>
      
      <div class="form-group">
        <label for="cb-columns">Columns (internal corners):</label>
        <input type="number" id="cb-columns" value="5" />
      </div>
      
      <div class="form-group">
        <label for="cb-size">Square Size (mm):</label>
        <input type="number" id="cb-size" value="35" />
      </div>
      
      <div class="form-group">
        <label for="cb-placement">Placement:</label>
        <select id="cb-placement">
          <option value="perpendicular">Perpendicular</option>
          <option value="parallel">Parallel</option>
        </select>
      </div>
      
      <button onclick="handleCameraCalibration()" ${state.isProcessing ? 'disabled' : ''}>
        ${state.isProcessing ? 'Calibrating...' : 'Start Calibration'}
      </button>
      
      <div id="calibration-status"></div>
    </div>
  `;
}

function renderStep4() {
  const content = document.getElementById('content');
  const heightCm = state.subject.height ? (state.subject.height * 100).toFixed(0) : 'Not specified';
  const weightKg = state.subject.weight ? state.subject.weight.toFixed(0) : 'Not specified';

  content.innerHTML = `
    <div class="card">
      <h2>Step 4: Neutral Pose Calibration</h2>
      <p>Capture the subject's neutral standing pose for model scaling.</p>
      <p><strong>Instructions:</strong> Stand upright, face forward, arms slightly spread.</p>
      
      <div class="status">
        <strong>Subject:</strong> ${state.subject.name}<br>
        <strong>Height:</strong> ${heightCm} cm<br>
        <strong>Weight:</strong> ${weightKg} kg
      </div>
      
      <button onclick="handleNeutralPose()" ${state.isProcessing ? 'disabled' : ''}>
        ${state.isProcessing ? 'Calibrating...' : 'Start Neutral Pose Capture'}
      </button>
      
      <div id="neutral-status"></div>
    </div>
  `;
}

function renderStep5() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 5: Record Trial</h2>
      <p>Record a movement trial. The system will capture video from all calibrated cameras.</p>
      
      ${state.trial ? `
        <div class="status success">
          <strong>✓ Trial Recorded</strong><br>
          ID: ${state.trial.id}<br>
          Name: ${state.trial.name}<br>
          Status: Processing complete
        </div>
        <button onclick="nextStep()" class="secondary">Continue to Next Step</button>
      ` : `
        <div class="form-group">
          <label for="trial-name">Trial Name:</label>
          <input type="text" id="trial-name" value="cmj-test-1" ${state.isProcessing ? 'disabled' : ''} />
        </div>
        
        <button 
          onclick="handleRecordTrial()" 
          ${state.isProcessing && !state.recording ? 'disabled' : ''}
          class="${state.recording ? 'danger' : ''}"
        >
          ${state.recording ? '⏹ Stop Recording' : (state.isProcessing ? 'Starting...' : 'Start Recording')}
        </button>
        
        <div id="trial-status"></div>
      `}
    </div>
  `;
}

function renderStep6() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 6: Start Analysis</h2>
      <p>Analyze the recorded trial to extract biomechanical metrics.</p>
      
      <div class="status">
        <strong>Trial:</strong> ${state.trial.name}<br>
        <strong>Analysis Type:</strong> Counter Movement Jump
      </div>
      
      ${state.analysisTask ? `
        <div class="status success">
          <strong>✓ Analysis Complete</strong><br>
          Task ID: ${state.analysisTask.task_id}
        </div>
        <button onclick="nextStep()" class="secondary">View Results</button>
      ` : `
        <button onclick="handleStartAnalysis()" ${state.isProcessing ? 'disabled' : ''}>
          ${state.isProcessing ? 'Analyzing...' : 'Start Analysis'}
        </button>
        
        <div id="analysis-status"></div>
      `}
    </div>
  `;
}

function renderStep7() {
  const content = document.getElementById('content');

  if (!state.results) {
    content.innerHTML = `
      <div class="card">
        <h2>Step 7: Loading Results...</h2>
        <p>Downloading analysis results...</p>
      </div>
    `;
    handleDownloadResults();
    return;
  }

  const metrics = state.results.metrics;

  content.innerHTML = `
    <div class="card">
      <h2>Step 7: Analysis Results</h2>
      <h3>${state.results.analysis_title}</h3>
      <p>${state.results.analysis_description}</p>
      
      <div class="metrics-grid">
        ${renderMetric(metrics['00_jump_height_COM'], 'cm')}
        ${renderMetric(metrics['01_jump_time'], 's')}
        ${renderMetric(metrics['03_reactive_strength_index_COM'], '')}
        ${renderMetric(metrics['04_peak_vertical_COM_speed_during_takeoff'], 'm/s')}
      </div>
      
      <h3 style="margin-top: 30px;">Bilateral Metrics</h3>
      
      <div class="bilateral-metrics">
        ${renderBilateralMetric(metrics['05_peak_knee_extension_speed_during_takeoff'], 'deg/s')}
        ${renderBilateralMetric(metrics['06_peak_hip_extension_speed_during_takeoff'], 'deg/s')}
        ${renderBilateralMetric(metrics['07_peak_knee_flexion_angle_during_landing'], '°')}
        ${renderBilateralMetric(metrics['08_peak_dynamic_knee_valgus_angle_during_landing'], '°')}
      </div>
      
      <div style="margin-top: 30px;">
        <button onclick="exportJSON()">Export JSON</button>
        <button onclick="exportCSV()" class="secondary">Export CSV</button>
        <button onclick="resetDemo()" class="danger">Reset Demo</button>
      </div>
    </div>
  `;
}

function renderMetric(metric, unit) {
  if (!metric || metric.value.type !== 'single') return '';

  return `
    <div class="metric-card">
      <div class="metric-label">${metric.label}</div>
      <div class="metric-value">
        ${metric.value.value.toFixed(metric.decimal_places)}
        <span class="metric-unit">${unit}</span>
      </div>
    </div>
  `;
}

function renderBilateralMetric(metric, unit) {
  if (!metric || metric.value.type !== 'bilateral') return '';

  const asymmetry = Math.abs(
    ((metric.value.left - metric.value.right) / metric.value.left) * 100
  ).toFixed(1);

  return `
    <div class="bilateral-side">
      <h4>${metric.label}</h4>
      <p><strong>Left:</strong> ${metric.value.left.toFixed(metric.decimal_places)} ${unit}</p>
      <p><strong>Right:</strong> ${metric.value.right.toFixed(metric.decimal_places)} ${unit}</p>
      <p><strong>Asymmetry:</strong> ${asymmetry}%</p>
      <small>${metric.info}</small>
    </div>
  `;
}

// Handler functions
async function handleCreateSession() {
  state.isProcessing = true;
  renderStep1();

  log('Calling client.createSession()');

  try {
    const session = await state.client.createSession();
    state.session = session;
    state.sessionIsNew = true;
    state.sessions.push(session);
    log(`Session created: ${session.id}`, 'success');
    log('New session requires calibration (steps 2-4)');
    renderStep1();
  } catch (error) {
    log(`Failed to create session: ${error.message}`, 'error');
    state.isProcessing = false;
    renderStep1();
  }
}

async function loadSubjects() {
  log('Calling client.subjectList()');

  try {
    const subjects = await state.client.subjectList();
    state.subjects = subjects;
    log(`Loaded ${subjects.length} subjects`, 'success');
    renderStep2();
  } catch (error) {
    log(`Failed to load subjects: ${error.message}`, 'error');
    state.subjects = [];
    renderStep2();
  }
}

async function handleSelectSubject(subjectId) {
  log(`Selecting subject ID: ${subjectId}`);

  const subject = state.subjects.find(s => s.id === subjectId);
  if (subject) {
    state.subject = subject;
    log(`Subject selected: ${subject.name}`, 'success');
    renderStep2();
  } else {
    log(`Subject not found: ${subjectId}`, 'error');
  }
}

function showCreateSubject() {
  state.creatingSubject = true;
  renderStep2();
}

async function handleCreateSubject() {
  const name = document.getElementById('subject-name').value.trim();
  if (!name) {
    log('Please enter a name', 'error');
    return;
  }

  const weight = parseFloat(document.getElementById('subject-weight').value);
  const height = parseFloat(document.getElementById('subject-height').value);
  const birthYear = parseInt(document.getElementById('subject-birth-year').value);
  const sexAtBirth = document.getElementById('subject-sex').value;
  const gender = document.getElementById('subject-gender').value;
  const tagsInput = document.getElementById('subject-tags').value;
  const tags = tagsInput
    ? tagsInput.split(',').map(t => t.trim()).filter(t => t)
    : ['unimpaired'];

  state.isProcessing = true;
  renderStep2();

  const parameters = {
    name: name,
    weight: weight,
    height: height,
    birth_year: birthYear,
    sex_at_birth: sexAtBirth,
    gender: gender,
    characteristics: '',
    subject_tags: tags,
    terms: true,
  };

  log(`Calling client.createSubject("${name}")`);

  try {
    const subject = await state.client.createSubject(parameters);
    state.subject = subject;
    state.subjects.push(subject);
    state.creatingSubject = false;
    state.isProcessing = false;
    log(`Subject created: ${subject.name} (ID: ${subject.id})`, 'success');
    renderStep2();
  } catch (error) {
    log(`Failed to create subject: ${error.message}`, 'error');
    state.isProcessing = false;
    renderStep2();
  }
}

async function handleCameraCalibration() {
  const details = {
    rows: parseInt(document.getElementById('cb-rows').value),
    columns: parseInt(document.getElementById('cb-columns').value),
    square_size: parseInt(document.getElementById('cb-size').value),
    placement: document.getElementById('cb-placement').value
  };

  state.isProcessing = true;
  const statusDiv = document.getElementById('calibration-status');

  log('Calling client.calibrateCamera(...)');

  try {
    await state.client.calibrateCamera(state.session, details, (status) => {
      log(`Calibration status: ${JSON.stringify(status)}`);

      if (status.type === 'recording') {
        statusDiv.innerHTML = '<div class="status">⏺ Recording checkerboard views...</div>';
      } else if (status.type === 'uploading') {
        const percent = (status.uploaded / status.total) * 100;
        statusDiv.innerHTML = `
          <div class="status">
            ⬆ Uploading: ${status.uploaded}/${status.total}
            <div class="progress">
              <div class="progress-fill" style="width: ${percent}%">${percent.toFixed(0)}%</div>
            </div>
          </div>
        `;
      } else if (status.type === 'processing') {
        statusDiv.innerHTML = '<div class="status">⚙ Processing calibration data...</div>';
      } else if (status.type === 'done') {
        statusDiv.innerHTML = '<div class="status success">✓ Camera calibration complete!</div>';
      }
    });

    log('Camera calibration complete!', 'success');
    setTimeout(() => nextStep(), 1500);
  } catch (error) {
    log(`Calibration failed: ${error.message}`, 'error');
    state.isProcessing = false;
  }
}

async function handleNeutralPose() {
  state.isProcessing = true;
  const statusDiv = document.getElementById('neutral-status');

  log('Calling client.calibrateNeutralPose(...)');

  try {
    await state.client.calibrateNeutralPose(state.subject, state.session, (status) => {
      log(`Neutral pose status: ${JSON.stringify(status)}`);

      if (status.type === 'recording') {
        statusDiv.innerHTML = '<div class="status">⏺ Recording neutral pose...</div>';
      } else if (status.type === 'uploading') {
        const percent = (status.uploaded / status.total) * 100;
        statusDiv.innerHTML = `
          <div class="status">
            ⬆ Uploading: ${status.uploaded}/${status.total}
            <div class="progress">
              <div class="progress-fill" style="width: ${percent}%">${percent.toFixed(0)}%</div>
            </div>
          </div>
        `;
      } else if (status.type === 'processing') {
        const percentText = status.percent ? ` ${status.percent}%` : '';
        statusDiv.innerHTML = `<div class="status">⚙ Processing${percentText}...</div>`;
      } else if (status.type === 'done') {
        statusDiv.innerHTML = '<div class="status success">✓ Neutral pose calibration complete!</div>';
      }
    });

    log('Neutral pose calibration complete!', 'success');
    setTimeout(() => nextStep(), 1500);
  } catch (error) {
    log(`Neutral pose failed: ${error.message}`, 'error');
    state.isProcessing = false;
  }
}

async function handleRecordTrial() {
  const statusDiv = document.getElementById('trial-status');

  // If already recording, stop it
  if (state.recording) {
    log('Calling client.stopRecording(session)');

    try {
      await state.client.stopRecording(state.session);
      log('Recording stopped', 'success');

      state.recording = false;
      state.isProcessing = true;

      // Poll for processing
      statusDiv.innerHTML = '<div class="status">⚙ Processing trial...</div>';
      log('Polling for trial status...');

      let status = await state.client.getStatus(state.currentTrial);
      let attempts = 0;

      while (status.type !== 'ready' && attempts < 10) {
        log(`Trial status: ${JSON.stringify(status)}`);

        if (status.type === 'uploading') {
          const percent = (status.uploaded / status.total) * 100;
          statusDiv.innerHTML = `
            <div class="status">
              ⬆ Uploading: ${status.uploaded}/${status.total}
              <div class="progress">
                <div class="progress-fill" style="width: ${percent}%">${percent.toFixed(0)}%</div>
              </div>
            </div>
          `;
        } else if (status.type === 'processing') {
          statusDiv.innerHTML = '<div class="status">⚙ Processing videos...</div>';
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        status = await state.client.getStatus(state.currentTrial);
        attempts++;
      }

      state.trial = state.currentTrial;
      state.currentTrial = null;
      state.isProcessing = false;
      log('Trial ready for analysis!', 'success');
      renderStep5();
    } catch (error) {
      log(`Stop recording failed: ${error.message}`, 'error');
      state.recording = false;
      state.isProcessing = false;
      renderStep5();
    }
    return;
  }

  // Otherwise, start recording
  const trialName = document.getElementById('trial-name').value;

  if (!trialName) {
    log('Please enter a trial name', 'error');
    return;
  }

  state.isProcessing = true;
  renderStep5();

  log(`Calling client.record("${trialName}", session)`);

  try {
    const trial = await state.client.record(trialName, state.session);
    state.currentTrial = trial;
    state.recording = true;
    state.isProcessing = false;

    log(`Recording started: ${trial.id}`, 'success');
    statusDiv.innerHTML = '<div class="status">⏺ Recording in progress... Click "Stop Recording" when done.</div>';

    renderStep5();
  } catch (error) {
    log(`Recording failed: ${error.message}`, 'error');
    state.isProcessing = false;
    renderStep5();
  }
}

async function handleStartAnalysis() {
  state.isProcessing = true;
  const statusDiv = document.getElementById('analysis-status');

  log('Calling client.startAnalysis("counter_movement_jump", trial, session)');

  try {
    const task = await state.client.startAnalysis('counter_movement_jump', state.trial, state.session);
    log(`Analysis started: ${task.task_id}`, 'success');

    statusDiv.innerHTML = '<div class="status">⚙ Analysis in progress...</div>';

    // Poll for completion
    log('Polling for analysis status...');
    let analysisStatus = await state.client.getAnalysisStatus(task);
    let attempts = 0;

    while (analysisStatus.type === 'processing' && attempts < 5) {
      log(`Analysis status: ${JSON.stringify(analysisStatus)}`);
      statusDiv.innerHTML = '<div class="status">⚙ Computing biomechanical metrics...</div>';

      await new Promise(resolve => setTimeout(resolve, 3000));
      analysisStatus = await state.client.getAnalysisStatus(task);
      attempts++;
    }

    if (analysisStatus.type === 'completed') {
      state.analysisTask = task;
      log(`Analysis complete! Result tags: ${analysisStatus.result_tags.join(', ')}`, 'success');
      renderStep6();
    } else {
      log('Analysis failed', 'error');
      state.isProcessing = false;
    }
  } catch (error) {
    log(`Analysis failed: ${error.message}`, 'error');
    state.isProcessing = false;
  }
}

async function handleDownloadResults() {
  log('Calling client.downloadAnalysisResult(...)');

  try {
    const result = await state.client.downloadAnalysisResult(state.trial, 'countermovement_jump');
    state.results = result;
    log('Results downloaded successfully!', 'success');
    renderStep7();
  } catch (error) {
    log(`Failed to download results: ${error.message}`, 'error');
  }
}

function exportJSON() {
  const json = JSON.stringify(state.results, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analysis-results.json';
  a.click();
  log('Exported results as JSON', 'success');
}

function exportCSV() {
  let csv = 'Metric,Value,Unit,Info\n';

  Object.entries(state.results.metrics).forEach(([key, metric]) => {
    if (metric.value.type === 'single') {
      csv += `"${metric.label}",${metric.value.value},"","${metric.info}"\n`;
    } else if (metric.value.type === 'bilateral') {
      csv += `"${metric.label} (Left)",${metric.value.left},"","${metric.info}"\n`;
      csv += `"${metric.label} (Right)",${metric.value.right},"","${metric.info}"\n`;
    }
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analysis-results.csv';
  a.click();
  log('Exported results as CSV', 'success');
}

function resetDemo() {
  if (confirm('Reset the entire demo? This will clear all progress.')) {
    state.currentStep = 1;
    state.sessions = [];
    state.session = null;
    state.sessionIsNew = false;
    state.subjects = [];
    state.subject = null;
    state.creatingSubject = false;
    state.trial = null;
    state.analysisTask = null;
    state.results = null;
    state.isProcessing = false;

    log('Demo reset', 'success');
    render();
  }
}

// Navigation
function nextStep() {
  // If we just selected an existing session at step 1, jump to step 5
  if (state.currentStep === 1 && !state.sessionIsNew) {
    log('Jumping to step 5 (recording) - skipping calibration for existing session');
    state.currentStep = 5;
  } else {
    state.currentStep++;
  }

  state.isProcessing = false;
  render();
}

function prevStep() {
  if (state.currentStep > 1) {
    state.currentStep--;
    render();
  }
}

// Main render function
function render() {
  updateProgress();

  // Update code example
  document.getElementById('code-snippet').textContent = codeExamples[state.currentStep];

  // Render current step
  switch (state.currentStep) {
    case 1: renderStep1(); break;
    case 2: renderStep2(); break;
    case 3: renderStep3(); break;
    case 4: renderStep4(); break;
    case 5: renderStep5(); break;
    case 6: renderStep6(); break;
    case 7: renderStep7(); break;
  }
}

// Initialize
async function init() {
  log('Initializing ModelHealth SDK with API key...');

  try {
    state.client = new ModelHealthService({
      apiKey: "mh_aabdf0739662564e62d347defab3637fbdbe260a"
    });

    await state.client.init();

    // Verify authentication with API key
    const isAuth = await state.client.isAuthenticated();
    log(`SDK initialized successfully! Authenticated: ${isAuth}`, 'success');

    render();
  } catch (error) {
    log(`Failed to initialize SDK: ${error.message}`, 'error');
  }

  // Setup clear log button
  document.getElementById('clear-log').addEventListener('click', () => {
    document.getElementById('log').textContent = 'Log cleared.\n';
  });
}

// Make functions globally accessible
window.handleCreateSession = handleCreateSession;
window.loadSubjects = loadSubjects;
window.handleSelectSubject = handleSelectSubject;
window.handleCameraCalibration = handleCameraCalibration;
window.handleNeutralPose = handleNeutralPose;
window.handleRecordTrial = handleRecordTrial;
window.handleStartAnalysis = handleStartAnalysis;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
window.resetDemo = resetDemo;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.loadSessions = loadSessions;
window.handleSelectSession = handleSelectSession;
window.showCreateSubject = showCreateSubject;
window.handleCreateSubject = handleCreateSubject;

init();
