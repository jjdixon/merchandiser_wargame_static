// App shell: owns UI state, the clock loop, DOM event wiring, and the feature
// registry wiring. Business logic lives in src/engine and src/features/*/engine.ts;
// views are pure render functions. See docs/architecture.md.
import './styles.css';
import {
  addWork, assign, autoAssign, buildDay, delayTruck, enableFeatures, endDay, fmt, freshWeek, merchById, move,
  projectDay, raise, readyAt, rulesFrom, setRule, singleDayWeek, storeById, tick, withFeatureDefaults,
  DAYS, END_OF_DAY, type SimState, type WeekState,
} from './engine';
import { seed } from './data';
import { FEATURES } from './features';
import type { AppApi, Feature, FeatureSummary, Scope, Slot, ViewCtx, ViewDef } from './app/feature';
import { esc } from './ui/shared';
import { schedulerView } from './ui/scheduler';
import { merchandiserView } from './ui/merchandiser';
import { supervisorView } from './ui/supervisor';
import { rulesView } from './ui/rules';
import { weekView } from './ui/week';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

/* ---------- features: which are on (per browser) ---------- */
const FEATURE_KEY = 'mwg.features';
function loadSwitches(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(FEATURE_KEY) ?? '{}') } catch { return {} }
}
let switches = loadSwitches();
const isOn = (f: Feature) => f.locked || (switches[f.id] ?? f.defaultOn);
const enabledFeatures = () => FEATURES.filter(isOn);
function saveSwitches(): void { try { localStorage.setItem(FEATURE_KEY, JSON.stringify(switches)) } catch { /* storage blocked */ } }

/* ---------- views (core tabs + feature tabs) ---------- */
const CORE_VIEWS: ViewDef[] = [
  { id: 'sched', label: 'Scheduler', render: schedulerView },
  { id: 'merch', label: 'Merchandiser', render: merchandiserView },
  { id: 'super', label: 'Supervisor', render: supervisorView },
  { id: 'week', label: 'Week', render: weekView },
  { id: 'rules', label: 'Pay & labor rules', render: rulesView },
];
const everyView = () => [...CORE_VIEWS, ...enabledFeatures().flatMap(f => f.views ?? [])];

/* ---------- access (who is looking) ---------- */
// The first enabled feature that returns access decides; none = see everything.
function currentAccess() {
  for (const f of enabledFeatures()) { const a = f.access?.(app); if (a) return a }
  return null;
}
function scope(): Scope {
  const a = currentAccess();
  return { merch: a?.merch ?? (() => true), store: a?.store ?? (() => true), lockMerch: a?.lockMerch ?? null, label: a?.label ?? null };
}
const allViews = () => {
  const allowed = currentAccess()?.views;
  return everyView().filter(v => !allowed || v.public || allowed.includes(v.id));
};

/* ---------- app state ---------- */
// A session starts on the seed's Thursday; "New week" starts a Monday-to-Sunday run.
let week: WeekState = singleDayWeek(seed);
let state: SimState = buildDay(seed, week, seed.scenarios[0].id, { features: enabledFeatures() });
const scenarioId = () => $<HTMLSelectElement>('#scn').value || seed.scenarios[0].id;
// Future days only change when the week, rules or features change (all via user
// actions), so projections are cached until the next change.
const projCache = new Map<number, SimState>();
const project = (day: number) => {
  if (!projCache.has(day)) projCache.set(day, projectDay(seed, week, day, scenarioId(), { rules: state.rules, features: enabledFeatures() }));
  return projCache.get(day)!;
};
let view = location.hash.slice(1);
let selM = state.merch[0].id;
let running = false, speed = 10, holding = false;

const scenarioLabel = () => $<HTMLSelectElement>('#scn').selectedOptions[0]?.text ?? '';
const currentView = () => allViews().find(v => v.id === view) ?? CORE_VIEWS[0];

function ctx(): ViewCtx {
  const on = enabledFeatures();
  const catalog: FeatureSummary[] = FEATURES.map(f => ({ id: f.id, title: f.title, description: f.description, requirements: f.requirements, locked: !!f.locked, on: isOn(f) }));
  const sc = scope();
  return {
    scope: sc,
    state, selM: sc.lockMerch ?? selM,
    settings: state.ext.settings,
    projectDay: project,
    catalog,
    slot: (name: Slot) => on.flatMap(f => f.panels ?? []).filter(p => p.slot === name)
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100)).map(p => p.render(ctx())).join(''),
  };
}

const app: AppApi = {
  get state() { return state },
  get selM() { return scope().lockMerch ?? selM },
  get viewName() { return currentView().label },
  get scenarioLabel() { return scenarioLabel() },
  get viewer() { return scope().label },
  projectDay: project,
  refresh: () => changed(),
  toast,
  copy,
};

/* ---------- rendering ---------- */
// Re-rendering replaces #view's HTML. Skip while the user is mid-interaction
// (pointer held down, or focus in a text field/select) so clicks and typing
// aren't swallowed by a re-render.
function busy(): boolean {
  const a = document.activeElement as HTMLInputElement | null;
  return !!a && $('#view').contains(a) && (a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox'));
}
function renderTabs(): void {
  $('#tabs').innerHTML = allViews().map(v => {
    const badge = v.badge?.() ?? '';
    return `<button role="tab" data-v="${esc(v.id)}" aria-selected="${v.id === view}">${esc(v.label)}${badge ? ` <span class="mono">${esc(badge)}</span>` : ''}</button>`;
  }).join('');
}
/** Keep the current tab (and phone selection) within what the viewer may see. */
function clampToAccess(): void {
  const vs = allViews();
  if (!vs.some(v => v.id === view)) {
    // Prefer the role's first listed tab (e.g. Supervisor for an MSL).
    const preferred = currentAccess()?.views?.find(id => vs.some(v => v.id === id));
    view = preferred ?? vs[0]?.id ?? 'sched';
  }
  const sc = scope();
  if (!sc.merch(merchById(state, selM)!)) selM = state.merch.find(sc.merch)?.id ?? selM;
}
function render(force = false): void {
  $('#clk').textContent = fmt(state.t);
  $('#dow').textContent = DAYS[state.day];
  ($('#endDay') as HTMLButtonElement).disabled = state.day >= 6;
  $('#endDay').textContent = state.day >= 6 ? 'Week done' : `End day → ${DAYS[state.day + 1]}`;
  if (!force && holding) return;
  clampToAccess();
  renderTabs();
  const hdr = $('#hdrSlot');
  if (force || !hdr.contains(document.activeElement)) hdr.innerHTML = ctx().slot('header');
  if (!force && busy()) return;
  $('#view').innerHTML = currentView().render(ctx());
}

/* ---------- curveball bar (built from enabled features) ---------- */
function fillCurveballs(): void {
  const cbs = state.ext.curveballs;
  $('#inject').hidden = cbs.length === 0;
  const typeSel = $<HTMLSelectElement>('#evType');
  if (document.activeElement === typeSel) return;
  const prevType = typeSel.value;
  typeSel.innerHTML = cbs.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
  if (cbs.some(c => c.id === prevType)) typeSel.value = prevType;
  fillTargets();
}
function fillTargets(): void {
  const cb = state.ext.curveballs.find(c => c.id === $<HTMLSelectElement>('#evType').value);
  const sel = $<HTMLSelectElement>('#evTarget'), params = $('#evParams');
  if (!cb || document.activeElement === sel || params.contains(document.activeElement)) return;
  const prev = sel.value;
  const opts = cb.targets(state);
  sel.innerHTML = opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('') || '<option value="">Nothing eligible</option>';
  if (opts.some(o => o.value === prev)) sel.value = prev;
  const prevParams = Object.fromEntries([...params.querySelectorAll<HTMLSelectElement>('select')].map(s => [s.dataset.param, s.value]));
  params.innerHTML = (cb.params ?? []).map(p =>
    `<select data-param="${esc(p.id)}" aria-label="${esc(p.label)}">${p.options.map(o => `<option value="${esc(o.value)}"${(prevParams[p.id] ?? p.default) === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`).join('');
}

function changed(): void { projCache.clear(); fillCurveballs(); render(true) }
function toast(msg: string): void {
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
async function copy(text: string, okMsg: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); toast(okMsg) }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg) } catch { toast('Select and copy the text manually') }
    ta.remove();
  }
}
function setRunning(on: boolean): void {
  running = on;
  const b = $('#play');
  b.textContent = on ? '❚❚ Pause' : '▶ Run';
  b.setAttribute('aria-label', on ? 'Pause simulation' : 'Start simulation');
}
function loadScenario(id: string): void {
  setRunning(false);
  state = buildDay(seed, week, id, { rules: state.rules, features: enabledFeatures() });
  if (!merchById(state, selM)) selM = state.merch[0].id;
  changed();
}
function toggleFeature(id: string): void {
  const f = FEATURES.find(x => x.id === id);
  if (!f || f.locked) return;
  switches[id] = !isOn(f);
  saveSwitches();
  enableFeatures(state, enabledFeatures());
  if (!allViews().some(v => v.id === view)) view = 'rules';
  toast(`${f.title} ${switches[id] ? 'on' : 'off'}`);
}

/* ---------- header wiring ---------- */
$<HTMLSelectElement>('#scn').innerHTML = seed.scenarios.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');

document.addEventListener('pointerdown', () => (holding = true), true);
const release = () => setTimeout(() => (holding = false), 0);
document.addEventListener('pointerup', release, true);
document.addEventListener('pointercancel', release, true);

$('#tabs').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-v]');
  if (!b) return;
  view = b.dataset.v!;
  try { history.replaceState(null, '', '#' + view) } catch { /* sandboxed */ }
  render(true);
});
$('#play').addEventListener('click', () => setRunning(!running));
$<HTMLSelectElement>('#spd').addEventListener('change', e => (speed = Number((e.target as HTMLSelectElement).value)));
$('#reset').addEventListener('click', () => loadScenario($<HTMLSelectElement>('#scn').value));
$('#endDay').addEventListener('click', () => {
  if (state.day >= 6) return;
  const done = DAYS[state.day];
  endDay(state);
  loadScenario(scenarioId());
  toast(`${done} rolled into the week — now ${DAYS[state.day]}`);
});
$('#newWeek').addEventListener('click', () => {
  week = freshWeek(seed);
  loadScenario(scenarioId());
  toast('New week — Monday, nobody has hours yet');
});
$<HTMLSelectElement>('#scn').addEventListener('change', e => {
  const sel = e.target as HTMLSelectElement;
  loadScenario(sel.value); toast('Loaded: ' + sel.selectedOptions[0].text);
});
$('#evType').addEventListener('change', () => { $('#evParams').innerHTML = ''; fillTargets() });
$('#evGo').addEventListener('click', () => {
  const cb = state.ext.curveballs.find(c => c.id === $<HTMLSelectElement>('#evType').value);
  const target = $<HTMLSelectElement>('#evTarget').value;
  if (!cb || !target) return;
  const params = Object.fromEntries([...$('#evParams').querySelectorAll<HTMLSelectElement>('select')].map(s => [s.dataset.param!, s.value]));
  cb.apply(state, target, params);
  changed(); toast('Curveball thrown');
});

/* ---------- view wiring (delegated) ---------- */
// Feature elements can live in the view or the header slot.
for (const host of [$('#hdrSlot')]) {
  host.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act*=":"]');
    if (!b) return;
    const [fid, name] = b.dataset.act!.split(':');
    enabledFeatures().find(x => x.id === fid)?.actions?.[name]?.(app, b);
  });
  host.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (!t.dataset.fchange) return;
    const [fid, name] = t.dataset.fchange.split(':');
    enabledFeatures().find(x => x.id === fid)?.changes?.[name]?.(app, t);
  });
}
const V = $('#view');
V.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!b || (b as HTMLButtonElement).disabled) return;
  const a = b.dataset.act!, id = b.dataset.id ?? '';
  // Feature actions: data-act="<feature id>:<action>"
  if (a.includes(':')) {
    const [fid, name] = a.split(':');
    const f = enabledFeatures().find(x => x.id === fid);
    f?.actions?.[name]?.(app, b);
    return;
  }
  const s = id ? storeById(state, id) : undefined;
  switch (a) {
    case 'selm': selM = id; break;
    case 'up': if (s) move(state, s, -1); break;
    case 'dn': if (s) move(state, s, 1); break;
    case 'auto': autoAssign(state); toast('Open stops re-assigned'); break;
    case 'give': if (s) { assign(state, s, b.dataset.m!); raise(state, 'info', `${s.name} covered by ${merchById(state, b.dataset.m!)!.name}.`) } break;
    case 'trucknot': if (s) { delayTruck(state, s, 30); raise(state, 'warn', `${merchById(state, app.selM)!.name} at ${s.name}: truck not here. Pushed ready time to ${fmt(readyAt(state, s))}.`) } break;
    case 'long': if (s) { addWork(state, s, 15); raise(state, 'warn', `${merchById(state, app.selM)!.name} running long at ${s.name} (+15 min).`) } break;
    case 'rreset': state.rules = withFeatureDefaults(rulesFrom(seed.rules), enabledFeatures()); break;
    case 'feature-toggle': toggleFeature(id); break;
  }
  changed();
});
V.addEventListener('change', e => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.fchange) {
    const [fid, name] = t.dataset.fchange.split(':');
    enabledFeatures().find(x => x.id === fid)?.changes?.[name]?.(app, t);
    return;
  }
  if (t.dataset.assign !== undefined) { assign(state, storeById(state, t.dataset.assign)!, t.value || null); t.blur() }
  else if (t.dataset.issue) {
    if (t.value) raise(state, 'warn', `${merchById(state, app.selM)!.name} at ${storeById(state, t.dataset.issue)!.name}: ${t.value}.`);
    toast('Sent to supervisor'); t.blur();
  } else if (t.dataset.k) {
    setRule(state.rules, t.dataset.k, t.type === 'checkbox' ? t.checked : Number(t.value) || 0);
    if (t.type !== 'checkbox') t.blur();
  } else return;
  changed();
});

/* ---------- startup ---------- */
// Only locked features may mount (a mount can't be undone when switched off).
for (const f of FEATURES) if (f.mount && f.locked) f.mount(app);
changed();

/* ---------- clock loop ---------- */
let last = performance.now(), sinceRender = 0;
setInterval(() => {
  const now = performance.now(), dt = (now - last) / 1000;
  last = now;
  if (!running) return;
  tick(state, dt * speed);
  if (state.t >= END_OF_DAY) setRunning(false);
  sinceRender += dt;
  if (sinceRender >= 0.5) { sinceRender = 0; fillTargets(); render() }
}, 100);
