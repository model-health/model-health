/**
 * Model Health TypeScript SDK — check account usage and plan state.
 * Mirrors examples/python/get_usage.py.
 *
 * Usage:
 *   npx tsx get_usage.ts [<api_key>]
 */

import { ModelHealthClient } from '@modelhealth/modelhealth';
import type { UsageInfo } from '@modelhealth/modelhealth';
import { loadApiKey, attachLogging } from './_shared.js';

async function connect(apiKey: string): Promise<ModelHealthClient> {
  console.log('Connecting...');
  const client = new ModelHealthClient({ apiKey, autoInit: false });
  await client.init();
  attachLogging(client);
  return client;
}

function printUsage(usage: UsageInfo): void {
  console.log(`  Recording allowed:  ${usage.recordingAllowed}`);
  if (!usage.recordingAllowed) {
    console.log(`  Reason:              ${usage.reason}`);
  }
  console.log(`  Plan:                ${usage.planName ?? '(no active plan)'}`);
  console.log(`  Activities used:     ${usage.activitiesUsed ?? '(none)'}`);
  console.log(`  Activities max:      ${usage.activitiesMax ?? '(unlimited/none)'}`);
  console.log(`  Period end:          ${usage.periodEnd?.toISOString() ?? '(none)'}`);
  console.log(`  Reset period:        ${usage.resetPeriod ?? '(none)'}`);
  console.log(`  Free trial:          ${usage.isFreeTrial}`);
  console.log(`  Auto-renews:         ${usage.willAutoRenew}`);
}

async function main() {
  const args = process.argv.slice(2);
  const client = await connect(loadApiKey(args[0]));

  const usage = await client.usage();
  console.log();
  printUsage(usage);
}

main().catch(err => { console.error(`Error: ${err.message ?? err}`); process.exit(1); });
