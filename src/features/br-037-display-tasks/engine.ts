// BR-037 Store-level display task workflow.
// Every display task due at a store today (core: dueAction) becomes visit steps:
//   setup  → "Build" (built, or not built + a standard reason, or not applicable)
//            then "Validate built" (matches / partly / doesn't match, photo per policy)
//   check  → recurring "Check" (in place, fixed today, partly, gone + reason, couldn't check)
//   remove → "Remove expired" (removed, or not + reason)
// Answers are recorded as core display events with a compliance result, so
// compliance (BR-040), the store page (BR-041) and photo review (BR-043) can read
// them. Setups that are late are flagged on the step and escalate to the store's
// MSL at day start once they are N days overdue.
import {
  DAYS, dueAction, hash01, merchById, overdueDays, raise, recordDisplay, ruleNum,
  type DisplayAction, type DisplayResult, type DisplayTask, type EngineFeature, type SimState, type StepAnswer, type Store, type VisitStep,
} from '../../engine';
import REASONS from './reasons.json';

export const ID = 'br-037-display-tasks';
export const QUALITY = 'br037.quality';
export const ESCALATE = 'br037.escalateAfter';

export const BUILT = 'Built';
export const NA = 'Not applicable — store not in this promotion';
export const notBuilt = (r: string) => `Not built — ${r}`;
export const VALIDATE = ['Matches the standard', 'Partly (missing product, sign or space)', "Doesn't match the standard"];
export const CHECK_OK = ['In place and full', 'In place — fixed it today', 'Partly there'];
export const gone = (r: string) => `Not there — ${r}`;
export const cantCheck = "Couldn't check — area blocked";
export const REMOVED = 'Removed';
export const notRemoved = (r: string) => `Not removed — ${r}`;

const RESULT: Record<string, DisplayResult> = {
  [VALIDATE[0]]: 'compliant', [VALIDATE[1]]: 'partially compliant', [VALIDATE[2]]: 'non-compliant',
  [CHECK_OK[0]]: 'compliant', [CHECK_OK[1]]: 'compliant', [CHECK_OK[2]]: 'partially compliant',
  [NA]: 'not applicable', [cantCheck]: 'unable to verify', [REMOVED]: 'compliant',
};

/** Map an answer to a compliance result and reason. */
export function resultOf(action: DisplayAction, choice: string): { result: DisplayResult; reason?: string } | null {
  if (RESULT[choice]) return { result: RESULT[choice] };
  const m = /^(Not built|Not there|Not removed) — (.+)$/.exec(choice);
  if (!m) return null;
  return { result: action === 'remove' ? 'non-compliant' : 'absent', reason: m[2] };
}

export const stepId = (t: DisplayTask, part: string) => `${ID}:${t.id}:${part}`;
export const dueToday = (state: SimState, s: Store) =>
  state.displays.tasks.filter(t => t.storeId === s.id).map(t => ({ t, action: dueAction(state, t) })).filter((x): x is { t: DisplayTask; action: DisplayAction } => !!x.action);

function late(state: SimState, t: DisplayTask): string {
  const d = overdueDays(state, t);
  return d ? ` ${d} day${d > 1 ? 's' : ''} late.` : '';
}

export function steps(state: SimState, s: Store): VisitStep[] {
  return dueToday(state, s).flatMap(({ t, action }, i): VisitStep[] => {
    const base = { featureId: ID, phase: 'display' as const, kind: 'choice' as const, required: true, needsProduct: true };
    const where = `${t.fixture} · ${t.location} · ${t.products.join(', ')}`;
    const q = (k: string) => hash01(`${state.scenario}|${t.id}|${k}`), quality = ruleNum(state.rules, QUALITY, 75) / 100;
    if (action === 'setup') {
      const build: VisitStep = {
        ...base, id: stepId(t, 'build'), order: i * 10, title: `Build display: ${t.name}`,
        detail: `${where}. ${t.instructions}${t.delivery ? ` ${t.delivery}.` : ''}${late(state, t)}`,
        options: [BUILT, ...REASONS.absence.map(notBuilt), NA],
        autoAnswer: () => ({ choice: q('b') < quality + 0.12 ? BUILT : notBuilt(REASONS.absence[Math.floor(q('r') * REASONS.absence.length)]) }),
      };
      const chosen = s.answers[build.id]?.choice;
      if (chosen && chosen !== BUILT) return [build];
      return [build, {
        ...base, id: stepId(t, 'validate'), order: i * 10 + 1, title: `Validate built: ${t.name}`,
        detail: 'Full, signed, priced, in the sold-in location.', options: VALIDATE, photo: 'optional',
        autoAnswer: () => { const u = q('v'); return { choice: u < quality ? VALIDATE[0] : u < quality + 0.15 ? VALIDATE[1] : VALIDATE[2] } },
      }];
    }
    if (action === 'check') return [{
      ...base, id: stepId(t, 'check'), order: i * 10, title: `Check display: ${t.name}`,
      detail: `${where}. Runs until ${t.end <= 6 ? DAYS[Math.max(0, t.end)] : 'next week'}.`,
      options: [...CHECK_OK, ...REASONS.check.map(gone), cantCheck], photo: 'optional',
      autoAnswer: () => {
        const u = q('c');
        const choice = u < quality ? CHECK_OK[0] : u < quality + 0.1 ? CHECK_OK[1] : u < quality + 0.17 ? CHECK_OK[2]
          : u < quality + 0.22 ? gone(REASONS.check[Math.floor(q('cr') * REASONS.check.length)]) : cantCheck;
        return { choice };
      },
    }];
    return [{
      ...base, id: stepId(t, 'remove'), order: i * 10, title: `Remove expired: ${t.name}`,
      detail: `${where}. ${t.instructions}`, options: [REMOVED, ...REASONS.removal.map(notRemoved)],
      autoAnswer: () => ({ choice: q('x') < 0.9 ? REMOVED : notRemoved(REASONS.removal[0]) }),
    }];
  });
}

export function onStepAnswered(state: SimState, s: Store, step: VisitStep, a: StepAnswer): void {
  if (step.featureId !== ID || !a.choice) return;
  const [, taskId, part] = step.id.split(':');
  const t = state.displays.tasks.find(x => x.id === taskId);
  if (!t) return;
  if (part === 'build' && a.choice === BUILT) return;           // wait for the validation
  const action: DisplayAction = part === 'build' || part === 'validate' ? 'setup' : (part as DisplayAction);
  const r = resultOf(action, a.choice);
  if (!r) return;
  const m = merchById(state, s.assign ?? '');
  recordDisplay(state, { taskId, storeId: s.id, action, result: r.result, reason: r.reason, by: m?.name ?? 'Merchandiser', photo: a.photo, auto: !!a.auto });
  if (r.result === 'absent' || r.result === 'non-compliant')
    raise(state, 'warn', `Display ${action === 'remove' ? 'not removed' : r.result} at ${s.name}: ${t.name}${r.reason ? ` (${r.reason})` : ''} — MSL${s.market ? ' ' + s.market : ''} to follow up.`, `${ID}:${t.id}:${action}:${state.day}`);
}

/** At day start: setups this late go to the store's MSL. */
export function escalate(state: SimState): void {
  const after = ruleNum(state.rules, ESCALATE, 1);
  for (const t of state.displays.tasks) {
    const d = overdueDays(state, t);
    if (!d || d < after || state.day > t.end) continue;
    const s = state.stores.find(x => x.id === t.storeId);
    const market = s?.market ?? '';
    raise(state, 'bad', `Overdue display: ${t.name} at ${s?.name ?? t.storeId} is ${d} day${d > 1 ? 's' : ''} late — escalated to MSL${market ? ' ' + market : ''}.`, `${ID}:esc:${t.id}:${state.day}`);
  }
}

export const br037DisplayTasksEngine: EngineFeature = {
  id: ID,
  title: 'Display tasks',
  description: 'Display setups, recurring checks and removals in the store visit, with standard reasons, overdue flags and escalation to the MSL.',
  requirements: ['BR-037'],
  defaultOn: true,
  ruleDefaults: { [QUALITY]: 75, [ESCALATE]: 1 },
  settings: [
    { key: ESCALATE, label: 'Escalate a late setup after (days)', help: 'Overdue setups go to the store\'s MSL at the start of the day', type: 'number', step: 1, section: 'Displays' },
    { key: QUALITY, label: 'Simulated displays done to standard (%)', help: 'How often a simulated merchandiser gets a display right (war-game dial)', type: 'number', step: 5, section: 'Displays' },
  ],
  visitSteps: steps,
  onStepAnswered,
  onDayStart: escalate,
};
