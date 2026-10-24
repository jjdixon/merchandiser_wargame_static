// BR-009 Store hours and delivery-aware start times.
// Each store has receiving (invoicing) hours and merchandising hours. Product
// can't be worked until the truck is in, receiving is open and merchandising is
// allowed, so start times move with all three. Raises alerts when a truck lands
// after receiving closes or work will run past merchandising hours.
// (The late-truck "wait / move on / swap" prompt is T-302 in M3.)
import {
  allPlans, fmt, getRule, parseHHMM, raise, ruleBool,
  type EngineFeature, type Minutes, type Setting, type SimState, type Store,
} from '../../engine';
import DATA from './hours.json';

export const ID = 'br-009-store-hours';
export const FIELDS = ['receivingOpen', 'receivingClose', 'merchOpen', 'merchClose'] as const;
export type Field = (typeof FIELDS)[number];
export const FIELD_LABEL: Record<Field, string> = {
  receivingOpen: 'Receiving opens', receivingClose: 'Receiving closes', merchOpen: 'Merch from', merchClose: 'Merch until',
};
export type Hours = Record<Field, Minutes>;

export const hoursKey = (field: Field, storeId: string) => `br009.${field}.${storeId}`;
const RESPECT = 'br009.respectReceiving';

/** Seed hours for a store: per-store entry, else its chain (name prefix), else none. */
function seedHours(name: string, id: string): Record<Field, string> | null {
  const byStore = DATA.byStore as Record<string, Record<Field, string>>;
  if (byStore[id]) return byStore[id];
  const chain = Object.keys(DATA.byChain).find(c => name.startsWith(c));
  return chain ? (DATA.byChain as Record<string, Record<Field, string>>)[chain] : null;
}

/** Defaults for every store in the seed, as feature settings. */
export function defaultsFor(stores: Array<{ id: string; name: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of stores) {
    const h = seedHours(s.name, s.id);
    if (h) for (const f of FIELDS) out[hoursKey(f, s.id)] = parseHHMM(h[f]);
  }
  return out;
}

/** A store's hours, or null if it has none (e.g. an extra visit). */
export function hoursOf(state: SimState, s: Store): Hours | null {
  const v = FIELDS.map(f => getRule(state.rules, hoursKey(f, s.id)));
  if (v.some(x => typeof x !== 'number')) return null;
  return Object.fromEntries(FIELDS.map((f, i) => [f, v[i]])) as Hours;
}

export interface Conflict { storeId: string; kind: 'receivingClosed' | 'pastMerchHours'; text: string }

/** Today's hours problems in the current plan. */
export function conflicts(state: SimState): Conflict[] {
  const out: Conflict[] = [];
  for (const p of allPlans(state)) for (const x of p.stops) {
    const h = hoursOf(state, x.s);
    if (!h) continue;
    if (x.s.eta > h.receivingClose)
      out.push({ storeId: x.s.id, kind: 'receivingClosed', text: `${x.s.name}: truck due ${fmt(x.s.eta)}, after receiving closes at ${fmt(h.receivingClose)}.` });
    if (x.end > h.merchClose)
      out.push({ storeId: x.s.id, kind: 'pastMerchHours', text: `${x.s.name}: ${p.m.name} projects finishing ${fmt(x.end)}, past merchandising hours (${fmt(h.merchClose)}).` });
  }
  return out;
}

import SEED_STORES from '../../data/stores.json';

export const br009StoreHoursEngine: EngineFeature = {
  id: ID,
  title: 'Store hours',
  description: 'Receiving and merchandising hours per store; start times wait for receiving to open, with alerts for conflicts.',
  requirements: ['BR-009'],
  defaultOn: true,
  ruleDefaults: { [RESPECT]: true, ...defaultsFor(SEED_STORES) },
  settings: [
    { key: RESPECT, label: 'Wait for receiving to open', help: 'Off = treat product as workable when the truck arrives', type: 'boolean', section: 'Store hours' } as Setting,
  ],
  readyAt(state, s, base) {
    const h = hoursOf(state, s);
    if (!h) return base;
    return Math.max(base, h.merchOpen, ruleBool(state.rules, RESPECT, true) ? h.receivingOpen : 0);
  },
  onTick(state) {
    for (const c of conflicts(state)) {
      const s = state.stores.find(x => x.id === c.storeId)!;
      const h = hoursOf(state, s)!;
      // Warn when the truck is due, or an hour before merchandising hours end.
      const when = c.kind === 'receivingClosed' ? s.eta : h.merchClose - 60;
      if (state.t >= when) raise(state, c.kind === 'receivingClosed' ? 'bad' : 'warn', c.text, `${ID}:${c.kind}:${c.storeId}`);
    }
  },
};
