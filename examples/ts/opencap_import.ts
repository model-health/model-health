/**
 * Model Health TypeScript SDK — import an OpenCap session into Model Health.
 * Mirrors examples/python/opencap_import.py.
 *
 * Usage:
 *   npx tsx opencap_import.ts [<api_key>] [<opencap_session_id>] [<opencap_token>]
 *
 * Arguments are resolved from CLI args, .env file, or environment variables:
 *   MODEL_HEALTH_API_KEY  — Model Health API key
 *   OPENCAP_SESSION_ID   — OpenCap session UUID
 *   OPENCAP_TOKEN        — OpenCap authentication token (or prompted via login)
 *
 * Edit metaOverrides and trialMetaOverrides below to customise the import.
 */

import { ModelHealthService, ActivityType } from '@modelhealth/modelhealth';
import type {
  Subject, Session, Activity, Analysis,
  SessionConfig, SessionOpenSimModel, SessionScalingSetup, SessionCoreEngine,
  FilterFrequency, ImportStatus, ActivityStatus,
} from '@modelhealth/modelhealth';
import {
  loadApiKey, dotEnvValue, prompt, pickOne, confirm, sleep, closePrompts,
} from './_shared.js';
import * as fs from 'fs';
import * as path from 'path';

// MARK: - Configuration (edit here)

const metaOverrides: Record<string, string> = {
  openSimModel:    'LaiUhlrich2022_shoulder', // 'LaiUhlrich2022_shoulder' | 'LaiUhlrich2022'
  scalingsetup:    'upright_standing_pose',   // 'upright_standing_pose' | 'any_pose'
  coreengine:      'v1.0',                    // 'v0.2' | 'v0.3' | 'v1.0'
  filterfrequency: 'default',                 // 'default' | integer Hz as string
};

// Per-trial overrides keyed by trial name.
// Setting 'activity_type' will auto-launch analysis after processing.
const trialMetaOverrides: Record<string, { activity_type?: string }> = {};
// Example:
// const trialMetaOverrides: Record<string, { activity_type?: string }> = {
//   trial1: { activity_type: ActivityType.RangeOfMotion },
//   trial2: { activity_type: ActivityType.CounterMovementJump },
// };

// MARK: - Settings mapping

function openSimModelFrom(value: string | undefined): SessionOpenSimModel {
  return value === 'LaiUhlrich2022' ? 'LaiUhlrich2022' : 'LaiUhlrich2022_shoulder';
}

function scalingSetupFrom(value: string | undefined): SessionScalingSetup {
  return value === 'any_pose' ? 'any_pose' : 'upright_standing_pose';
}

function coreEngineFrom(value: string | undefined): SessionCoreEngine {
  if (value === 'v0.2') return 'v0.2';
  if (value === 'v0.3') return 'v0.3';
  return 'v1.0';
}

function filterFrequencyFrom(value: string | undefined): FilterFrequency {
  if (!value || value === 'default') return { type: 'default' };
  const hz = parseInt(value, 10);
  return isNaN(hz) ? { type: 'default' } : { type: 'hz', value: hz };
}

// MARK: - OpenCap API

type OpenCapTrial = Record<string, unknown>;
type OpenCapSession = { trials: OpenCapTrial[]; subject: string; meta?: unknown };

async function fetchOpenCapSession(id: string, token: string, baseURL = 'https://api.opencap.ai/', retries = 3): Promise<OpenCapSession> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${baseURL}sessions/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.status === 500) throw new Error('No server response. Likely not a valid session ID.');
      const json = await res.json() as Record<string, unknown>;
      if (!json['trials']) throw new Error('Session not found or not accessible.');
      const trials = (json['trials'] as OpenCapTrial[]).slice().sort(
        (a, b) => String(a['created_at'] ?? '') < String(b['created_at'] ?? '') ? -1 : 1
      );
      return { ...json, trials } as OpenCapSession;
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        console.log(`Connection error fetching session, retrying in 5s: ${err}`);
        await sleep(5_000);
      }
    }
  }
  throw lastErr;
}

async function fetchOpenCapSubject(id: string, token: string, baseURL = 'https://api.opencap.ai/', retries = 3): Promise<Record<string, unknown>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${baseURL}subjects/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.status === 500) throw new Error('No server response. Likely not a valid subject ID.');
      return await res.json() as Record<string, unknown>;
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        console.log(`Connection error fetching subject, retrying in 5s: ${err}`);
        await sleep(5_000);
      }
    }
  }
  throw lastErr;
}

function pickTrial(trials: OpenCapTrial[], predicate: (name: string) => boolean): OpenCapTrial | null {
  const matches = trials.filter(t => predicate(String(t['name'] ?? '').toLowerCase()));
  const done = matches.filter(t => t['status'] === 'done');
  const pool = done.length ? done : matches;
  if (!pool.length) return null;
  return pool.reduce((best, t) =>
    String(t['created_at'] ?? '') > String(best['created_at'] ?? '') ? t : best
  );
}

// MARK: - OpenCap login

async function opencapLogin(): Promise<string> {
  console.log('No OpenCap token found in .env or environment.');
  console.log('Log in with the credentials you use at app.opencap.ai.\n');
  const username = (await prompt('OpenCap username: ')).trim();
  const password = (await prompt('OpenCap password: ')).trim();

  const body = new URLSearchParams({ username, password });
  const res = await fetch('https://api.opencap.ai/login/', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const json = await res.json() as Record<string, unknown>;
  if (!json['token']) throw new Error('OpenCap login failed: unexpected response.');
  const token = String(json['token']);

  const envPath = path.join(process.cwd(), '.env');
  let envLines: string[] = [];
  if (fs.existsSync(envPath)) {
    envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
  }
  envLines = envLines.filter(l => !l.startsWith('OPENCAP_TOKEN'));
  if (envLines.length && !envLines[envLines.length - 1].endsWith('\n')) envLines.push('');
  envLines.push(`OPENCAP_TOKEN="${token}"`);
  fs.writeFileSync(envPath, envLines.join('\n') + '\n');
  console.log(`Login successful. Token saved to ${envPath}.`);
  return token;
}

// MARK: - Copy session

async function copySession(
  service: ModelHealthService,
  sessionId: string,
  token: string,
  apiURL = 'https://api.opencap.ai/'
): Promise<Session> {
  console.log(`Fetching OpenCap session ${sessionId}...`);
  const sourceSession = await fetchOpenCapSession(sessionId, token, apiURL);

  const meta = (typeof sourceSession.meta === 'object' && sourceSession.meta !== null
    ? sourceSession.meta : {}) as Record<string, unknown>;
  const settings = Object.assign(
    {},
    (meta['settings'] as Record<string, string> | undefined) ?? {},
    metaOverrides
  );
  if (Object.keys(metaOverrides).length) console.log('Applying settings overrides.');

  const config: SessionConfig = {
    opensimModel:    openSimModelFrom(settings['openSimModel']),
    scalingSetup:    scalingSetupFrom(settings['scalingsetup']),
    coreEngine:      coreEngineFrom(settings['coreengine']),
    filterFrequency: filterFrequencyFrom(settings['filterfrequency']),
  };
  console.log('Session settings configured.');

  const subjects = await service.subjectList();

  let subject: Subject;
  if (subjects.length > 0 && await confirm(`Found ${subjects.length} subject(s). Select an existing one?`, true)) {
    console.log();
    subject = await pickOne(subjects, 'Select subject', s => `${s.name}  (ID ${s.id})`);
    console.log(`  Using: ${subject.name}`);
  } else {
    console.log('Fetching subject from OpenCap session...');
    const subjectData = await fetchOpenCapSubject(sourceSession.subject, token, apiURL);
    const name = String(subjectData['name'] ?? subjectData['first_name'] ?? '').trim() || 'Unknown';
    const weight = parseFloat(String(subjectData['weight'] ?? '0')) || 0;
    const heightM = parseFloat(String(subjectData['height'] ?? '0')) || 0;
    const birthYear = subjectData['birth_year'] ? Number(subjectData['birth_year']) : undefined;
    subject = await service.createSubject({ name, weight, height: heightM * 100, birthYear });
    console.log('Subject created successfully.');
  }

  const trials = sourceSession.trials;

  let calibrationTrial: OpenCapTrial | null = null;
  const sessionWithCal = (meta['sessionWithCalibration'] as Record<string, unknown> | undefined);
  const parentId = sessionWithCal?.['id'] as string | undefined;
  if (parentId) {
    try {
      const parentSession = await fetchOpenCapSession(parentId, token, apiURL);
      calibrationTrial = pickTrial(parentSession.trials, n => n === 'calibration');
      if (calibrationTrial) console.log(`Using calibration from parent session ${parentId}.`);
    } catch (err) {
      console.log(`Could not load calibration from parent session: ${err}`);
    }
  }
  if (!calibrationTrial) {
    calibrationTrial = pickTrial(trials, n => n === 'calibration');
  }

  if (!calibrationTrial) { console.error('No calibration trial found, cannot proceed.'); process.exit(1); }
  if (calibrationTrial['status'] !== 'done') { console.error('Calibration trial is not done, cannot proceed.'); process.exit(1); }

  const neutral = pickTrial(trials, n => n.includes('neutral'));
  if (!neutral) { console.error('No neutral trial found, cannot proceed.'); process.exit(1); }
  if (neutral['status'] !== 'done') { console.error('Neutral trial is not done, cannot proceed.'); process.exit(1); }

  const dynamicTrials = trials.filter(t => {
    const name = String(t['name'] ?? '').toLowerCase();
    return name !== 'calibration' && name !== 'neutral';
  });

  const annotated = dynamicTrials.map(trial => {
    const name = String(trial['name'] ?? '');
    const overrides = trialMetaOverrides[name];
    if (!overrides?.activity_type) return trial;
    return { ...trial, activity_type: overrides.activity_type };
  });

  const allTrials = [calibrationTrial, neutral, ...annotated];

  const seenUploads: Record<string, number> = {};
  let currentTrial: string | null = null;

  const onStatus = (status: ImportStatus) => {
    if (status.type === 'creating_session') {
      console.log('  Creating session...');
    } else if (status.type === 'created_session') {
      console.log(`  Session created: ${status.session_id}`);
    } else if (status.type === 'uploading_video' && status.uploaded < status.total) {
      currentTrial = status.trial;
      if (seenUploads[status.trial] !== status.uploaded) {
        seenUploads[status.trial] = status.uploaded;
        console.log(`  [${status.trial}] Uploading video ${status.uploaded + 1}/${status.total}...`);
      }
    } else if (status.type === 'processing') {
      const t = currentTrial ?? 'activity';
      console.log(`  [${t}] Processing...`);
    }
  };

  console.log('Importing session...');
  const importedSession = await service.importSession(
    JSON.stringify(allTrials),
    subject,
    config,
    onStatus,
  );
  console.log(`All activities imported successfully to session: ${importedSession.id}`);
  return importedSession;
}

// MARK: - Wait for activities

async function waitForActivities(service: ModelHealthService, session: Session): Promise<void> {
  let pending = session.activities.filter(a => {
    const name = (a.name ?? '').toLowerCase();
    return name !== 'calibration' && name !== 'neutral';
  });

  if (!pending.length) return;

  console.log('Waiting for activities to process...');
  const analyzing: Array<[Activity, Analysis]> = [];

  while (pending.length) {
    const stillPending: Activity[] = [];
    for (const activity of pending) {
      const label = activity.name ?? activity.id;
      let status: ActivityStatus;
      try {
        status = await service.activityStatus(activity);
      } catch (err) {
        console.log(`  [${label}] Status check failed: ${err}`);
        continue;
      }

      if (status.type === 'uploading') {
        console.log(`  [${label}] Uploading (${status.uploaded}/${status.total})...`);
        stillPending.push(activity);
      } else if (status.type === 'processing') {
        console.log(`  [${label}] Processing...`);
        stillPending.push(activity);
      } else if (status.type === 'analyzing') {
        console.log(`  [${label}] Analyzing — queued for analysis poll.`);
        analyzing.push([activity, { taskId: status.taskId }]);
      } else if (status.type === 'ready') {
        console.log(`  [${label}] Ready.`);
      } else {
        console.log(`  [${label}] Failed.`);
      }
    }
    if (stillPending.length) await sleep(5_000);
    pending = stillPending;
  }

  if (!analyzing.length) return;

  console.log('Waiting for analyses to complete...');
  let pendingAnalysis = analyzing;
  while (pendingAnalysis.length) {
    const stillPending: Array<[Activity, Analysis]> = [];
    for (const [activity, task] of pendingAnalysis) {
      const label = activity.name ?? activity.id;
      const status = await service.analysisStatus(task);
      if (status.type === 'processing') {
        console.log(`  [${label}] Analyzing...`);
        stillPending.push([activity, task]);
      } else if (status.type === 'completed') {
        console.log(`  [${label}] Analysis complete.`);
      } else {
        console.log(`  [${label}] Analysis failed.`);
      }
    }
    if (stillPending.length) await sleep(5_000);
    pendingAnalysis = stillPending;
  }
}

// MARK: - CLI helpers

async function resolveSessionId(args: string[]): Promise<string> {
  if (args[1] && args[1].trim()) return args[1].trim();
  const fromEnv = dotEnvValue('OPENCAP_SESSION_ID') ?? process.env.OPENCAP_SESSION_ID;
  if (fromEnv) return fromEnv;
  const id = (await prompt('OpenCap session ID: ')).trim();
  if (!id) { console.error('OpenCap session ID is required.'); process.exit(1); }
  return id;
}

async function resolveOpenCapToken(args: string[]): Promise<string> {
  if (args[2] && args[2].trim()) return args[2].trim();
  const fromEnv = dotEnvValue('OPENCAP_TOKEN') ?? process.env.OPENCAP_TOKEN;
  if (fromEnv) return fromEnv;
  return opencapLogin();
}

// MARK: - Main

async function main() {
  const args = process.argv.slice(2);

  const apiKey   = loadApiKey(args[0]);
  const sessionId = await resolveSessionId(args);
  const token     = await resolveOpenCapToken(args);

  console.log('Connecting to Model Health...');
  const service = new ModelHealthService({ apiKey, autoInit: false });
  await service.init();

  const session = await copySession(service, sessionId, token);
  await waitForActivities(service, session);
  console.log(`Import complete. Session ID: ${session.id}`);
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); })
  .finally(closePrompts);
