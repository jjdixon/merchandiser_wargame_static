// App shell: owns UI state, the clock loop, and all DOM event wiring.
// Business logic lives in src/engine; views in src/ui are pure render functions.
import './styles.css';
import {
  addWork, assign, autoAssign, callOut, delayTruck, extraVisit, fmt, heavierLoad, merchById,
  move, newDay, raise, readyAt, rulesFrom, storeById, tick, END_OF_DAY, type Rules, type SimState,
} from './engine';
import { FINDING_AREAS, seed } from './data';
import { findingsAsMarkdown, findingsAsText, loadFindings, saveFindings, type Finding } from './storage/findings';
import { esc, type ViewCtx } from './ui/shared';
import { schedulerView } from './ui/scheduler';
import { merchandiserView } from './ui/merchandiser';
import { supervisorView } from './ui/supervisor';
import { rulesView } from './ui/rules';
import { findingsView } from './ui/findings';

const VIEWS = {
  sched: { name: 'Scheduler', render: schedulerView },
  merch: { name: 'Merchandiser', render: merchandiserView },
  super: { name: 'Supervisor', render: supervisorView },
  rules: { name: 'Pay & labor rules', render: rulesView },
  findings: { name: 'Findings', render: findingsView },
} as const;
type ViewId = keyof typeof VIEWS;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

/* ---------- app state ---------- */
let state: SimState = newDay(seed, seed.scenarios[0].id);
let findings: Finding[] = loadFindings();
let view: ViewId = (location.hash.slice(1) in VIEWS ? location.hash.slice(1) : 'sched') as ViewId;
let selM = state.merch[0].id;
let running = false, speed = 10, holding = false, confirmClear = false;

const ctx = (): ViewCtx => ({ state, selM, findings, confirmClear });

/* ---------- rendering ---------- */
// Re-rendering replaces #view's HTML. Skip while the user is mid-interaction
// (pointer held down, or focus in a text field/select) so clicks and typing
// aren't swallowed by a re-render.
function busy(): boolean {
  const a = document.activeElement as HTMLInputElement | null;
  return !!a && $('#view').contains(a) && (a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox'));
}
function render(force = false): void {
  $('#clk').textContent = fmt(state.t);
  $('#fcount').textContent = findings.length ? `(${findings.length})` : '';
  document.querySelectorAll<HTMLButtonElement>('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === view)));
  if (!force && (holding || busy())) return;
  $('#view').innerHTML = VIEWS[view].render(ctx());
}
function fillTargets(): void {
  const ty = $<HTMLSelectElement>('#evType').value, sel = $<HTMLSelectElement>('#evTarget');
  if (document.activeElement === sel) return;
  const prev = sel.value;
  const t = state.t;
  const opts = ty === 'callout'
    ? state.merch.filter(m => !m.out).map(m => `<option value="${m.id}">${esc(m.name)}</option>`)
    : state.stores.filter(s => ty === 'truck' ? !(s.lock && t >= s.lock.start) : ty === 'heavy' ? !(s.lock && t >= s.lock.end) : !s.id.startsWith('x'))
        .map(s => `<option value="${s.id}">${esc(s.name)}</option>`);
  sel.innerHTML = opts.join('') || '<option value="">Nothing eligible</option>';
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  $('#evAmt').hidden = ty !== 'truck';
}
function changed(): void { fillTargets(); render(true) }
function toast(msg: string): void {
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
function setRunning(on: boolean): void {
  running = on;
  const b = $('#play');
  b.textContent = on ? '❚❚ Pause' : '▶ Run';
  b.setAttribute('aria-label', on ? 'Pause simulation' : 'Start simulation');
}
function loadScenario(id: string): void {
  setRunning(false);
  state = newDay(seed, id, { ...state.rules });
  if (!merchById(state, selM)) selM = state.merch[0].id;
  changed();
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

/* ---------- header wiring ---------- */
$<HTMLSelectElement>('#scn').innerHTML = seed.scenarios.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
$<HTMLSelectElement>('#fbCat').innerHTML = FINDING_AREAS.map(a => `<option>${esc(a)}</option>`).join('');

document.addEventListener('pointerdown', () => (holding = true), true);
const release = () => setTimeout(() => (holding = false), 0);
document.addEventListener('pointerup', release, true);
document.addEventListener('pointercancel', release, true);

$('#tabs').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-v]');
  if (!b) return;
  view = b.dataset.v as ViewId; confirmClear = false;
  try { history.replaceState(null, '', '#' + view) } catch { /* sandboxed */ }
  render(true);
});
$('#play').addEventListener('click', () => setRunning(!running));
$<HTMLSelectElement>('#spd').addEventListener('change', e => (speed = Number((e.target as HTMLSelectElement).value)));
$('#reset').addEventListener('click', () => loadScenario($<HTMLSelectElement>('#scn').value));
$<HTMLSelectElement>('#scn').addEventListener('change', e => {
  const sel = e.target as HTMLSelectElement;
  loadScenario(sel.value); toast('Loaded: ' + sel.selectedOptions[0].text);
});
$('#evType').addEventListener('change', fillTargets);
$('#evGo').addEventListener('click', () => {
  const ty = $<HTMLSelectElement>('#evType').value, id = $<HTMLSelectElement>('#evTarget').value;
  if (!id) return;
  if (ty === 'truck') {
    const s = storeById(state, id)!, d = Number($<HTMLSelectElement>('#evAmt').value);
    delayTruck(state, s, d);
    raise(state, 'warn', `Dispatch: truck to ${s.name} running ${d} min late — now ${fmt(s.eta)}.`);
  } else if (ty === 'heavy') {
    const s = storeById(state, id)!, add = heavierLoad(state, s);
    raise(state, 'warn', `${s.name}: order came in ${add} cases heavier (${s.cases} total).`);
  } else if (ty === 'callout') {
    callOut(state, merchById(state, id)!);
  } else if (ty === 'extra') {
    const b = storeById(state, id)!, n = extraVisit(state, b);
    raise(state, 'bad', `${b.name} manager called: wants an extra visit today (≈${n.cases} cases, done by ${fmt(n.win)}).`);
  }
  changed(); toast('Curveball thrown');
});

/* ---------- view wiring (delegated) ---------- */
const V = $('#view');
V.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
  if (!b || b.disabled) return;
  const a = b.dataset.act!, id = b.dataset.id ?? '';
  const s = id ? storeById(state, id) : undefined;
  switch (a) {
    case 'selm': selM = id; break;
    case 'up': if (s) move(state, s, -1); break;
    case 'dn': if (s) move(state, s, 1); break;
    case 'auto': autoAssign(state); toast('Open stops re-assigned'); break;
    case 'give': if (s) { assign(state, s, b.dataset.m!); raise(state, 'info', `${s.name} covered by ${merchById(state, b.dataset.m!)!.name}.`) } break;
    case 'trucknot': if (s) { delayTruck(state, s, 30); raise(state, 'warn', `${merchById(state, selM)!.name} at ${s.name}: truck not here. Pushed ready time to ${fmt(readyAt(state.rules, s))}.`) } break;
    case 'long': if (s) { addWork(state, s, 15); raise(state, 'warn', `${merchById(state, selM)!.name} running long at ${s.name} (+15 min).`) } break;
    case 'rreset': state.rules = rulesFrom(seed.rules); break;
    case 'copy': void copy(findingsAsText(findings), `Copied ${findings.length} findings`); return;
    case 'copymd': void copy(findingsAsMarkdown(findings), 'Copied as Markdown checklist'); return;
    case 'clr': confirmClear = true; break;
    case 'clrno': confirmClear = false; break;
    case 'clryes': findings = []; saveFindings(findings); confirmClear = false; break;
    case 'fdel': findings = findings.filter(f => f.id !== id); saveFindings(findings); break;
  }
  changed();
});
V.addEventListener('change', e => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.assign !== undefined) { assign(state, storeById(state, t.dataset.assign)!, t.value || null); t.blur() }
  else if (t.dataset.task) { storeById(state, t.dataset.task)!.tasks[Number(t.dataset.i)] = t.checked }
  else if (t.dataset.issue) {
    if (t.value) raise(state, 'warn', `${merchById(state, selM)!.name} at ${storeById(state, t.dataset.issue)!.name}: ${t.value}.`);
    toast('Sent to supervisor'); t.blur();
  } else if (t.dataset.k) {
    const k = t.dataset.k as keyof Rules;
    (state.rules as unknown as Record<string, number | boolean>)[k] = t.type === 'checkbox' ? t.checked : Number(t.value) || 0;
    if (t.type !== 'checkbox') t.blur();
  }
  changed();
});

/* ---------- findings sheet ---------- */
const ctxLine = () => `${VIEWS[view].name}${view === 'merch' ? ' · ' + merchById(state, selM)!.name : ''} · ${fmt(state.t)} · ${$<HTMLSelectElement>('#scn').selectedOptions[0].text}`;
const closeSheet = () => { $('#scrim').hidden = true; $<HTMLTextAreaElement>('#fbTxt').value = '' };
$('#fab').addEventListener('click', () => {
  $('#fbCtx').textContent = ctxLine(); $('#scrim').hidden = false;
  setTimeout(() => $('#fbTxt').focus(), 30);
});
$('#fbCancel').addEventListener('click', closeSheet);
$('#scrim').addEventListener('click', e => { if ((e.target as HTMLElement).id === 'scrim') closeSheet() });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#scrim').hidden) closeSheet() });
$('#fbForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = $<HTMLTextAreaElement>('#fbTxt').value.trim();
  if (!text) { $('#fbTxt').focus(); return }
  findings.push({ id: 'f' + Date.now(), area: $<HTMLSelectElement>('#fbCat').value, context: ctxLine(), text, at: new Date().toISOString() });
  saveFindings(findings); closeSheet(); toast('Finding logged'); render(true);
});

/* ---------- clock loop ---------- */
fillTargets(); render(true);
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
