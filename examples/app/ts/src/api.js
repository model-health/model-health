/**
 * Model Health SDK client singleton and init.
 */
import { ModelHealthService } from '@modelhealth/modelhealth';
import { DEFAULT_API_KEY } from './constants.js';

let client = null;
let initPromise = null;

/**
 * Initialize the SDK with an API key. Safe to call multiple times.
 * @param {string} [apiKey]
 * @returns {Promise<ModelHealthService>}
 */
export async function initClient(apiKey = DEFAULT_API_KEY) {
  if (client)
    return client;
  if (initPromise)
    return initPromise;

  initPromise = (async () => {
    const c = new ModelHealthService({ apiKey });
    await c.init();
    client = c;
    return c;
  })();

  return initPromise;
}

/**
 * @returns {ModelHealthService | null}
 */
export function getClient() {
  return client;
}

/**
 * Clear client (e.g. on logout). Next initClient() will create a new one.
 */
export function clearClient() {
  client = null;
  initPromise = null;
}
