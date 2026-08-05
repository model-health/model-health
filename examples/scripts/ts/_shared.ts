/**
 * Shared utilities for Model Health TypeScript example scripts.
 * Mirrors examples/python/_utils.py and _prompts.py.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type { ModelHealthClient, Analysis, AnalysisStatus } from '@modelhealth/modelhealth';

// MARK: - Constants

export const INTERNAL_ACTIVITY_NAMES = new Set(['calibration', 'neutral']);

export const MOTION_DATA_EXT: Record<string, string> = {
  animation:      'json',
  kinematics_mot: 'mot',
  kinematics_csv: 'csv',
  markers_trc:    'trc',
  markers_csv:    'csv',
  model:          'osim',
};

export const ANALYSIS_DATA_EXT: Record<string, string> = {
  report:  'pdf',
  data:    'zip',
};

// MARK: - API key

export function loadApiKey(cliArg?: string): string {
  if (cliArg) return cliArg;
  const fromEnvFile = dotEnvValue('MODEL_HEALTH_API_KEY');
  if (fromEnvFile) return fromEnvFile;
  const fromEnv = process.env.MODEL_HEALTH_API_KEY;
  if (fromEnv) return fromEnv;
  console.error(
    'Model Health API key not found.\n' +
    'Provide it as a CLI argument or set MODEL_HEALTH_API_KEY in .env or your environment.'
  );
  process.exit(1);
}

export function dotEnvValue(key: string): string | undefined {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (trimmed.slice(0, eqIdx).trim() !== key) continue;
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
       (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

// MARK: - File I/O

export const downloadsDir = path.join(process.cwd(), 'downloads');

export function saveFile(filename: string, data: Uint8Array | Buffer): string {
  fs.mkdirSync(downloadsDir, { recursive: true });
  const filePath = path.join(downloadsDir, filename);
  fs.writeFileSync(filePath, data);
  return filePath;
}

// MARK: - Polling

export async function pollAnalysis(
  client: ModelHealthClient,
  task: Analysis,
  intervalMs = 10_000
): Promise<AnalysisStatus> {
  while (true) {
    const status = await client.analysisStatus(task);
    if (status.type === 'processing') {
      process.stdout.write('  Analysing...  \r');
    } else {
      process.stdout.write('\n');
      return status;
    }
    await sleep(intervalMs);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// MARK: - Prompts

let _rl: readline.Interface | null = null;

function getRL(): readline.Interface {
  if (!_rl) {
    _rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return _rl;
}

export function prompt(question: string): Promise<string> {
  return new Promise(resolve => getRL().question(question, resolve));
}

export function closePrompts(): void {
  _rl?.close();
  _rl = null;
}

export async function pickOne<T>(
  items: T[],
  question: string,
  label: (item: T) => string,
  defaultItem?: T
): Promise<T> {
  const defaultIdx = defaultItem !== undefined ? items.indexOf(defaultItem) : -1;
  items.forEach((item, i) => {
    const suffix = i === defaultIdx ? '  (default)' : '';
    console.log(`  ${i + 1}. ${label(item)}${suffix}`);
  });
  const rangeHint = defaultIdx >= 0 ? `1–${items.length}, Enter for ${defaultIdx + 1}` : `1–${items.length}`;
  while (true) {
    const raw = (await prompt(`\n${question} (${rangeHint}): `)).trim();
    if (raw === '' && defaultIdx >= 0) return items[defaultIdx];
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= items.length) return items[n - 1];
    console.log(`  Please enter a number between 1 and ${items.length}.`);
  }
}

export async function pickMulti<T>(
  items: T[],
  question: string,
  label: (item: T) => string
): Promise<T[]> {
  items.forEach((item, i) => console.log(`  ${i + 1}. ${label(item)}`));
  while (true) {
    const raw = await prompt(`\n${question} (e.g. 1 2 3): `);
    const indices = raw.trim().split(/\s+/).map(s => parseInt(s, 10) - 1);
    const selected = indices.filter(i => i >= 0 && i < items.length).map(i => items[i]);
    if (selected.length > 0) return selected;
    console.log(`  Please enter one or more numbers between 1 and ${items.length}.`);
  }
}

export async function confirm(question: string, defaultValue?: boolean): Promise<boolean> {
  const hint = defaultValue === true ? '[Y/n]' : defaultValue === false ? '[y/N]' : '[y/n]';
  while (true) {
    const raw = (await prompt(`${question} ${hint}: `)).trim().toLowerCase();
    if (raw === 'y' || raw === 'yes') return true;
    if (raw === 'n' || raw === 'no') return false;
    if (raw === '' && defaultValue !== undefined) return defaultValue;
    console.log('  Please enter y or n.');
  }
}
