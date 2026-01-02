import { ModelHealthService } from '@modelhealth/sdk';

// Application state
const state = {
  currentStep: 1,
  client: null,
  session: null,
  subjects: [],       // Available subjects list
  subject: null,
  trial: null,
  analysisTask: null,
  results: null,
  needsVerification: false,
  isProcessing: false
};

// Code examples for each step
const codeExamples = {
  1: `// Step 1: Login
const client = new ModelHealthService();
await client.init();

const result = await client.login(email, password);

if (result === "verification_required") {
  // Verification code sent to email
  await client.verify(code, rememberDevice);
}`,

  2: `// Step 2: Create Session
const session = await client.createSession();
console.log('Session created:', session.id);`,

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

// Render functions for each step
function renderStep1() {
  const content = document.getElementById('content');

  if (state.needsVerification) {
    content.innerHTML = `
      <div class="card">
        <h2>Step 1: Email Verification Required</h2>
        <p>A verification code has been sent to your email.</p>
        
        <div class="form-group">
          <label for="verify-code">Verification Code (6 digits):</label>
          <input type="text" id="verify-code" placeholder="123456" maxlength="6" />
        </div>
        
        <div class="checkbox-group">
          <label>
            <input type="checkbox" id="remember-device" checked />
            Remember this device for 90 days
          </label>
        </div>
        
        <button onclick="handleVerify()">Verify</button>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="card">
        <h2>Step 1: Login</h2>
        <p>Enter your credentials to authenticate with the ModelHealth API.</p>
        
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" placeholder="warren" value="warren" />
        </div>
        
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" placeholder="••••••••" value="testtesttesttesttest" />
        </div>
        
        <button onclick="handleLogin()" ${state.isProcessing ? 'disabled' : ''}>
          ${state.isProcessing ? 'Logging in...' : 'Login'}
        </button>
      </div>
    `;
  }
}

function renderStep2() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 2: Create Session</h2>
      <p>A session groups cameras and trials together for a recording workflow.</p>
      
      ${state.session ? `
        <div class="status success">
          <strong>✓ Session Created</strong><br>
          ID: ${state.session.id}<br>
          Name: ${state.session.name}
        </div>
        <button onclick="nextStep()" class="secondary">Continue to Next Step</button>
      ` : `
        <button onclick="handleCreateSession()" ${state.isProcessing ? 'disabled' : ''}>
          ${state.isProcessing ? 'Creating...' : 'Create New Session'}
        </button>
      `}
    </div>
  `;
}

function renderStep3() {
  const content = document.getElementById('content');

  if (state.subject) {
    // Subject selected
    content.innerHTML = `
      <div class="card">
        <h2>Step 3: Select Subject</h2>
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
        <h2>Step 3: Select Subject</h2>
        <p>Choose an existing subject for this session. Click to select.</p>
        
        <div style="max-height: 400px; overflow-y: auto;">
          ${subjectOptions}
        </div>
      </div>
    `;
  } else {
    // Loading subjects
    content.innerHTML = `
      <div class="card">
        <h2>Step 3: Loading Subjects...</h2>
        <p>Fetching available subjects...</p>
      </div>
    `;
    loadSubjects();
  }
}

function renderStep4() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 4: Camera Calibration</h2>
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

function renderStep5() {
  const content = document.getElementById('content');
  const heightCm = state.subject.height ? (state.subject.height * 100).toFixed(0) : 'Not specified';
  const weightKg = state.subject.weight ? state.subject.weight.toFixed(0) : 'Not specified';

  content.innerHTML = `
    <div class="card">
      <h2>Step 5: Neutral Pose Calibration</h2>
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

function renderStep6() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 6: Record Trial</h2>
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
          <input type="text" id="trial-name" value="cmj-test-1" />
        </div>
        
        <button onclick="handleRecordTrial()" ${state.isProcessing ? 'disabled' : ''}>
          ${state.isProcessing ? 'Recording...' : 'Start Recording'}
        </button>
        
        <div id="trial-status"></div>
      `}
    </div>
  `;
}

function renderStep7() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card">
      <h2>Step 7: Start Analysis</h2>
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

function renderStep8() {
  const content = document.getElementById('content');

  if (!state.results) {
    content.innerHTML = `
      <div class="card">
        <h2>Step 8: Loading Results...</h2>
        <p>Downloading analysis results...</p>
      </div>
    `;
    handleDownloadResults();
    return;
  }

  const metrics = state.results.metrics;

  content.innerHTML = `
    <div class="card">
      <h2>Step 8: Analysis Results</h2>
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
async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    log('Please enter email and password', 'error');
    return;
  }

  state.isProcessing = true;
  renderStep1();

  log(`Calling client.login("${email}", "***")`);

  try {
    const result = await state.client.login(email, password);
    log(`Login result: ${result}`, 'success');

    if (result === 'verification_required') {
      state.needsVerification = true;
      state.isProcessing = false;
      renderStep1();
    } else {
      log('Login successful!', 'success');
      nextStep();
    }
  } catch (error) {
    console.error('Full error:', error);
    log(`Login failed: ${error.message || error.toString() || JSON.stringify(error)}`, 'error');
    state.isProcessing = false;
    renderStep1();
  }
}

async function handleVerify() {
  const code = document.getElementById('verify-code').value;
  const rememberDevice = document.getElementById('remember-device').checked;

  if (!code || code.length !== 6) {
    log('Please enter a 6-digit code', 'error');
    return;
  }

  log(`Calling client.verify("${code}", ${rememberDevice})`);

  try {
    await state.client.verify(code, rememberDevice);
    log('Verification successful!', 'success');
    state.needsVerification = false;
    nextStep();
  } catch (error) {
    log(`Verification failed: ${error.message}`, 'error');
  }
}

async function handleCreateSession() {
  state.isProcessing = true;
  renderStep2();

  log('Calling client.createSession()');

  try {
    const session = await state.client.createSession();
    state.session = session;
    log(`Session created: ${session.id}`, 'success');
    renderStep2();
  } catch (error) {
    log(`Failed to create session: ${error.message}`, 'error');
    state.isProcessing = false;
    renderStep2();
  }
}

async function loadSubjects() {
  log('Calling client.subjectList()');

  try {
    const subjects = await state.client.subjectList();
    state.subjects = subjects;
    log(`Loaded ${subjects.length} subjects`, 'success');
    renderStep3();
  } catch (error) {
    log(`Failed to load subjects: ${error.message}`, 'error');
    state.subjects = [];
    renderStep3();
  }
}

async function handleSelectSubject(subjectId) {
  log(`Selecting subject ID: ${subjectId}`);

  const subject = state.subjects.find(s => s.id === subjectId);
  if (subject) {
    state.subject = subject;
    log(`Subject selected: ${subject.name}`, 'success');
    renderStep3();
  } else {
    log(`Subject not found: ${subjectId}`, 'error');
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
  const trialName = document.getElementById('trial-name').value;

  if (!trialName) {
    log('Please enter a trial name', 'error');
    return;
  }

  state.isProcessing = true;
  const statusDiv = document.getElementById('trial-status');

  log(`Calling client.record("${trialName}", session)`);

  try {
    const trial = await state.client.record(trialName, state.session);
    log(`Recording started: ${trial.id}`, 'success');

    statusDiv.innerHTML = '<div class="status">⏺ Recording in progress... (simulating 5 seconds)</div>';

    // Simulate recording duration
    await new Promise(resolve => setTimeout(resolve, 5000));

    log('Calling client.stopRecording(session)');
    await state.client.stopRecording(state.session);
    log('Recording stopped', 'success');

    // Poll for processing
    statusDiv.innerHTML = '<div class="status">⚙ Processing trial...</div>';
    log('Polling for trial status...');

    let status = await state.client.getStatus(trial);
    let attempts = 0;

    while (status.type !== 'ready' && attempts < 5) {
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
      status = await state.client.getStatus(trial);
      attempts++;
    }

    state.trial = trial;
    log('Trial ready for analysis!', 'success');
    renderStep6();
  } catch (error) {
    log(`Recording failed: ${error.message}`, 'error');
    state.isProcessing = false;
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
      renderStep7();
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
    renderStep8();
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
    state.session = null;
    state.subjects = [];
    state.subject = null;
    state.trial = null;
    state.analysisTask = null;
    state.results = null;
    state.needsVerification = false;
    state.isProcessing = false;

    log('Demo reset', 'success');
    render();
  }
}

// Navigation
function nextStep() {
  state.currentStep++;
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
    case 8: renderStep8(); break;
  }
}

// Initialize
async function init() {
  log('Initializing ModelHealth SDK...');

  state.client = new ModelHealthService();

  await state.client.init();
  log('SDK initialized successfully!', 'success');

  render();

  // Setup clear log button
  document.getElementById('clear-log').addEventListener('click', () => {
    document.getElementById('log').textContent = 'Log cleared.\n';
  });
}

// Make functions globally accessible
window.handleLogin = handleLogin;
window.handleVerify = handleVerify;
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

// Start the app
init();