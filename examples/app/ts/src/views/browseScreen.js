/**
 * The machinery behind the four browse screens.
 *
 * Every list in the SDK is read the same way — `client.<resource>.list(options)` hands back a
 * sequence you iterate — so the reading, the buttons and the row layout are written once here.
 * What each screen supplies is what genuinely differs between resources: which options it
 * accepts, which fields it sorts by, and what a row of it looks like.
 */
import { getClient } from '../api.js';
import { getState, subscribe } from '../state.js';

/** How many items one press of "Load more" pulls out of the sequence. */
const LOAD_STEP = 25;

/**
 * Builds one screen from a resource description.
 *
 * Each call closes over its own open sequence, so the four screens cannot disturb each other.
 */
export function createBrowseScreen(spec) {
  /**
   * The open sequence and its iterator.
   *
   * Deliberately not in application state: a sequence is a resource with a lifetime and
   * something has to release it, while `setState` only merges and broadcasts. Keeping it here
   * means exactly one place decides when it goes.
   */
  let live = null;
  /** Bumped per run, so a batch belonging to a superseded run can be recognised and dropped. */
  let runSeq = 0;

  const stateKey = `${spec.key}Browse`;
  const read = () => getState()[stateKey] || {};
  const write = (ctx, partial) => ctx.setState({ [stateKey]: { ...read(), ...partial } });

  // MARK: - Rendering

  function render(container, state, ctx) {
    const shell = container.querySelector(`#browse-shell-${spec.key}`);
    // The shell is rebuilt when it is missing — on first paint, or after another view wiped the
    // container — and once more when the lists the pickers are built from arrive. Everything
    // else updates in place, so a field being typed into is never destroyed underneath the
    // typing; the one rebuild happens on entry, before there is anything to type into.
    const token = read().refsLoaded ? 'ready' : 'pending';
    if (!shell || shell.dataset.refs !== token) {
      container.innerHTML = shellHtml(token);
      attachListeners(container, ctx);
    }
    syncControls(container);
    renderResults(container);
  }

  function shellHtml(token) {
    return `
      <div class="view-header">
        <button type="button" class="btn back" id="browse-back">← Back</button>
        <h1>${escapeHtml(spec.title)}</h1>
      </div>
      <div class="card" id="browse-shell-${spec.key}" data-refs="${token}">
        <div class="browse-filters">
          ${filterFieldsHtml()}
          <div class="form-group">
            <label for="f-order">Order by</label>
            <select id="f-order">${orderOptionsHtml()}</select>
          </div>
        </div>
      </div>
      <div class="browse-actions">
        <button type="button" class="btn primary" id="browse-apply">Apply</button>
        <button type="button" class="btn secondary" id="browse-more">Load ${LOAD_STEP} more</button>
      </div>
      <div class="browse-stats" id="browse-stats"></div>
      <div id="browse-error"></div>
      <div id="browse-results"></div>
    `;
  }

  function filterFieldsHtml() {
    const field = (body) => `<div class="form-group">${body}</div>`;
    const has = (name) => spec.filters.includes(name);
    const refs = read().refs || {};
    const parts = [];

    if (has('search')) {
      parts.push(field(`<label for="f-search">Search</label>
        <input type="text" id="f-search" placeholder="name contains…" />`));
    }
    if (has('subject')) {
      const options = (refs.subjects || []).map(
        (s) => `<option value="${s.id}">${escapeHtml(s.name || `#${s.id}`)}</option>`
      ).join('');
      parts.push(field(`<label for="f-subject">Subject</label>
        <select id="f-subject"><option value="">(any)</option>${options}</select>`));
    }
    if (has('calibrationSession')) {
      parts.push(field(`<label for="f-calibration-session">Calibrated under session</label>
        <select id="f-calibration-session"><option value="">(any)</option>${sessionOptions(refs)}</select>`));
    }
    if (has('session')) {
      parts.push(field(`<label for="f-session">Calibrated under session</label>
        <select id="f-session"><option value="">(any)</option>${sessionOptions(refs)}</select>`));
    }
    if (has('groups')) {
      const options = (refs.groups || []).map(
        (g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`
      ).join('');
      parts.push(field(`<label for="f-groups">Groups</label>
        <select id="f-groups" multiple size="3">${options}</select>`));
    }
    if (has('activityType')) {
      const options = (refs.activityTypes || []).map(
        (t) => `<option value="${t.id}">${escapeHtml(t.displayName)}</option>`
      ).join('');
      parts.push(field(`<label for="f-type">Activity type</label>
        <select id="f-type"><option value="">(any)</option>${options}</select>`));
    }
    if (has('dates')) {
      parts.push(field(`<label for="f-after">Created after</label>
        <input type="date" id="f-after" />`));
      parts.push(field(`<label for="f-before">Created before</label>
        <input type="date" id="f-before" />`));
    }
    if (has('onlyCompleted')) {
      parts.push(field(`<label for="f-completed">Analysis</label>
        <select id="f-completed">
          <option value="">(any)</option>
          <option value="done">only finished</option>
        </select>`));
    }
    if (has('excludeCalibration')) {
      parts.push(field(`<label for="f-calibration">Calibration activities</label>
        <select id="f-calibration">
          <option value="exclude">excluded</option>
          <option value="include">included</option>
        </select>`));
    }
    if (has('excludeAnalysisError')) {
      parts.push(field(`<label for="f-analysis-error">Failed analysis</label>
        <select id="f-analysis-error">
          <option value="include">included</option>
          <option value="exclude">left out</option>
        </select>`));
    }
    if (has('activityComplete')) {
      parts.push(field(`<label for="f-activity-complete">Activities finished</label>
        <select id="f-activity-complete">
          <option value="">(any)</option>
          <option value="yes">all finished</option>
          <option value="no">not all finished</option>
        </select>`));
    }
    if (has('tags')) {
      parts.push(field(`<label for="f-tags">Tags</label>
        <input type="text" id="f-tags" placeholder="comma separated" />`));
    }
    if (has('createdBy')) {
      parts.push(field(`<label for="f-created-by">Created by</label>
        <input type="text" id="f-created-by" placeholder="account ids, comma separated" />`));
    }
    return parts.join('');
  }

  function sessionOptions(refs) {
    return (refs.sessions || []).map(
      (s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name || s.id)}</option>`
    ).join('');
  }

  function orderOptionsHtml() {
    const label = (field) => field.replace(/([A-Z])/g, ' $1').toLowerCase();
    return [`<option value="">default (${escapeHtml(spec.defaultOrder)})</option>`]
      .concat(spec.orderBy.flatMap((field) => [
        `<option value="${field}">${escapeHtml(label(field))} ↑</option>`,
        `<option value="-${field}">${escapeHtml(label(field))} ↓</option>`,
      ]))
      .join('');
  }

  /**
   * Updates what changes between reads without rebuilding the controls.
   *
   * Writing properties rather than markup is what lets a half-typed filter survive a batch
   * arriving: the input keeps its identity, and with it its value, focus and caret.
   */
  function syncControls(container) {
    const el = (selector) => container.querySelector(selector);
    const view = read();
    const busy = !!view.busy;

    el('#browse-apply').disabled = busy;
    el('#browse-more').disabled = view.streamState !== 'open' || busy;

    el('#browse-stats').innerHTML = statsHtml(view);
    el('#browse-error').innerHTML = view.error
      ? `<div class="status error browse-error">${escapeHtml(view.error)}</div>`
      : '';
  }

  function statsHtml(view) {
    if (view.total == null && (view.items || []).length === 0)
      return '';

    return `
      <span><strong>${view.total ?? '—'}</strong> found</span>
      <span><strong>${(view.items || []).length}</strong> shown</span>
    `;
  }

  function renderResults(container) {
    const target = container.querySelector('#browse-results');
    const view = read();
    const items = view.items || [];

    if (view.busy && items.length === 0) {
      target.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';
      return;
    }
    if (items.length === 0) {
      target.innerHTML = view.streamState === 'none'
        ? ''
        : '<div class="empty-state"><p>Nothing matches this filter</p></div>';
      return;
    }
    const header = `<li class="browse-row head"><span class="idx">#</span>${
      spec.headers.map((h) => `<span class="browse-cell">${escapeHtml(h)}</span>`).join('')
    }</li>`;
    const rows = items.map((item, index) => `
      <li class="browse-row"><span class="idx">${index + 1}</span>${
        spec.columns(item).map((value) => `<span class="browse-cell">${escapeHtml(value ?? '—')}</span>`).join('')
      }</li>
    `).join('');
    target.innerHTML = `<ul class="browse-list">${header}${rows}</ul>`;
  }

  // MARK: - Reading

  /** Reads the controls straight from the DOM, so typing never has to touch application state. */
  function readOptions(container) {
    const value = (selector) => container.querySelector(selector)?.value.trim() || undefined;
    const has = (name) => spec.filters.includes(name);
    const refs = read().refs || {};
    const options = {};

    /** A comma-separated field as a list, or nothing when it is empty. */
    const list = (selector) => {
      const raw = value(selector);
      if (!raw) return undefined;
      const entries = raw.split(',').map((part) => part.trim()).filter(Boolean);
      return entries.length > 0 ? entries : undefined;
    };

    if (has('search')) options.search = value('#f-search');
    if (has('subject')) {
      const subject = value('#f-subject');
      if (subject) options.subject = Number(subject);
    }
    if (has('calibrationSession')) options.calibrationSession = value('#f-calibration-session');
    if (has('session')) options.session = value('#f-session');
    if (has('groups')) {
      const chosen = [...(container.querySelector('#f-groups')?.selectedOptions || [])]
        .map((option) => option.value);
      if (chosen.length > 0) options.groups = chosen;
    }
    if (has('activityType')) {
      const chosen = value('#f-type');
      options.activityType = (refs.activityTypes || []).find((t) => String(t.id) === chosen);
    }
    if (has('dates')) {
      options.createdAfter = value('#f-after');
      options.createdBefore = value('#f-before');
    }
    if (has('tags')) options.tags = list('#f-tags');
    if (has('createdBy')) {
      const ids = list('#f-created-by')?.map(Number).filter((id) => Number.isFinite(id));
      if (ids?.length) options.createdBy = ids;
    }
    if (has('activityComplete')) {
      const complete = value('#f-activity-complete');
      // Unset is not the same as false here, so only send it when a choice was made.
      if (complete) options.activityComplete = complete === 'yes';
    }
    if (has('onlyCompleted')) options.onlyCompleted = value('#f-completed') === 'done';
    if (has('excludeAnalysisError')) options.excludeAnalysisError = value('#f-analysis-error') === 'exclude';
    // Always explicit: leaving it out re-applies the SDK's own default of excluding them, so
    // choosing "included" would otherwise silently do nothing.
    if (has('excludeCalibration')) options.excludeCalibration = value('#f-calibration') !== 'include';

    options.orderBy = value('#f-order');
    return options;
  }

  async function openSequence(container, ctx) {
    dispose();
    const options = readOptions(container);
    const runId = ++runSeq;

    write(ctx, { items: [], total: null, error: null, streamState: 'none', busy: false });

    let stream;
    try {
      stream = getClient()[spec.resource].list(options);
    } catch (err) {
      write(ctx, { error: err?.message || String(err) });
      return;
    }

    live = { runId, stream, iterator: stream[Symbol.asyncIterator]() };
    // One thing at a time. A sequence cannot serve two reads at once, and asking it to takes
    // the page down rather than raising something catchable. Busy covers the count too, so the
    // list does not claim "nothing matches" while the count is still on its way.
    write(ctx, { streamState: 'open', busy: true });
    await readTotal(runId, ctx);
    if (live?.runId !== runId) return;

    write(ctx, { busy: false });
    if (live?.runId !== runId) return;

    await readMore(LOAD_STEP, ctx);
  }

  /** How many match, which the list reports without being read through. */
  async function readTotal(runId, ctx) {
    try {
      const total = await live?.stream.total;
      if (live?.runId !== runId) return;
      write(ctx, { total });
    } catch (err) {
      if (live?.runId !== runId) return;
      write(ctx, { error: err?.message || String(err) });
    }
  }

  /** Pulls at most `count` items out of the sequence, one `next()` at a time. */
  async function readMore(count, ctx) {
    if (!live || read().busy) return;
    const { runId, iterator } = live;
    write(ctx, { busy: true, error: null });

    const batch = [];
    let finished = false;
    try {
      for (let i = 0; i < count; i += 1) {
        const step = await iterator.next();
        if (step.done) { finished = true; break; }
        batch.push(step.value);
      }
    } catch (err) {
      if (live?.runId !== runId) return;
      write(ctx, {
        busy: false,
        streamState: 'failed',
        items: [...read().items, ...batch],
        error: err?.message || String(err),
      });
      return;
    }
    if (live?.runId !== runId) return;

    write(ctx, {
      items: [...read().items, ...batch],
      busy: false,
      streamState: finished ? 'exhausted' : 'open',
    });
  }

  /** Releases whatever is open. Safe to call when nothing is. */
  function dispose() {
    if (live) {
      live.stream.close();
      live = null;
    }
  }

  // MARK: - Wiring

  function attachListeners(container, ctx) {
    const on = (selector, handler) =>
      container.querySelector(selector)?.addEventListener('click', handler);

    on('#browse-back', () => ctx.navigate('sessions'));
    on('#browse-apply', () => openSequence(container, ctx));
    on('#browse-more', () => readMore(LOAD_STEP, ctx));
  }

  /**
   * The lists the pickers are built from — subjects, sessions, groups, activity types —
   * fetched only when a filter on this screen actually offers one.
   */
  async function loadReferences(ctx) {
    const has = (name) => spec.filters.includes(name);
    const client = getClient();
    const refs = {};
    try {
      if (has('subject')) refs.subjects = await client.subjects.list().all();
      if (has('calibrationSession') || has('session')) refs.sessions = await client.sessions.list().all();
      if (has('groups')) refs.groups = await client.groups.list().all();
      if (has('activityType')) refs.activityTypes = await client.activityTypes();
    } catch {
      // A picker with nothing in it still lets every other filter work, so a failure here is
      // not worth stopping the screen for.
    }
    write(ctx, { refs, refsLoaded: true });
  }

  async function onEnter(container, state, ctx) {
    dispose();
    runSeq += 1;
    await loadReferences(ctx);
    // Nothing tells a view it is being left, so watch for it. Without this an open sequence
    // would wait on the garbage collector to be released.
    const unsubscribe = subscribe((next) => {
      if (next.screen !== spec.screen) {
        dispose();
        unsubscribe();
      }
    });
    openSequence(container, ctx);
  }

  return { render, onEnter };
}

function escapeHtml(value) {
  if (value == null)
    return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

/** A date as a bare day, which is how these lists report and filter them. */
export function day(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '—';
}
