// BR-003 Digital route bidding and scheduling.
// Replace paper bidding: open a bid on a run (a set of stores), eligible people bid
// (qualified for every route type on the run), the award goes by the chosen rule
// (seniority by default, or same market first), and publishing makes the winner the
// run's permanent owner from the next day (core week.master).
import {
  DAYS, hash01, raise, ruleBool, weekState,
  type EngineFeature, type Merchandiser, type RouteType, type SimState,
} from '../../engine';
import SEN from './seniority.json';
import SEED_STORES from '../../data/stores.json';

export const ID = 'br-003-route-bidding';
const BY_SENIORITY = 'br003.bySeniority';

export interface Run { owner: string; storeIds: string[]; routeTypes: RouteType[]; market: string }
export interface Bid {
  id: number; run: Run; status: 'open' | 'awarded' | 'published';
  bidders: string[]; awardee?: string; why?: string; openedDay: number;
}
interface BidState { bids: Bid[]; nextId: number }
export const bidState = (state: SimState) => weekState<BidState>(state, ID, () => ({ bids: [], nextId: 1 }));

export const hired = (id: string) => (SEN.hired as Record<string, string>)[id] ?? '2099-01-01';

/**
 * Each person's run: the regular stores they own across the week (seed owner, or the
 * permanent owner set this week), whatever today's visit pattern is.
 */
export function runs(state: SimState): Run[] {
  const by = new Map<string, typeof SEED_STORES>();
  for (const row of SEED_STORES) {
    const owner = row.id in state.week.master ? state.week.master[row.id] : row.assignedTo;
    if (owner) by.set(owner, [...(by.get(owner) ?? []), row]);
  }
  return [...by].map(([owner, rows]) => ({
    owner, storeIds: rows.map(r => r.id), routeTypes: [...new Set(rows.map(r => r.routeType as RouteType))], market: rows[0].market,
  }));
}

export const eligible = (state: SimState, run: Run) =>
  state.merch.filter(m => m.id !== run.owner && run.routeTypes.every(t => m.routeTypes.includes(t)));

export function openBid(state: SimState, owner: string): Bid | null {
  const run = runs(state).find(r => r.owner === owner);
  const b = bidState(state);
  if (!run || b.bids.some(x => x.run.owner === owner && x.status === 'open')) return null;
  const bid: Bid = { id: b.nextId++, run, status: 'open', bidders: [], openedDay: state.day };
  b.bids.push(bid);
  raise(state, 'info', `Bid opened on ${run.storeIds.length}-store ${run.market} run (${run.routeTypes.join('/')}). ${eligible(state, run).length} eligible.`);
  return bid;
}

export function placeBid(state: SimState, bidId: number, merchId: string, on: boolean): boolean {
  const bid = bidState(state).bids.find(b => b.id === bidId);
  if (!bid || bid.status !== 'open' || !eligible(state, bid.run).some(m => m.id === merchId)) return false;
  bid.bidders = on ? [...new Set([...bid.bidders, merchId])] : bid.bidders.filter(x => x !== merchId);
  return true;
}

/** Eligible people bid about half the time (repeatable). */
export function simulateBids(state: SimState, bidId: number): void {
  const bid = bidState(state).bids.find(b => b.id === bidId);
  if (!bid) return;
  for (const m of eligible(state, bid.run)) if (hash01(`${state.scenario}|bid${bid.id}|${m.id}`) < 0.55) placeBid(state, bidId, m.id, true);
}

/** Pick the winner by the rule. */
export function award(state: SimState, bidId: number): Merchandiser | null {
  const bid = bidState(state).bids.find(b => b.id === bidId);
  if (!bid || bid.status !== 'open' || !bid.bidders.length) return null;
  const people = bid.bidders.map(id => state.merch.find(m => m.id === id)!).filter(Boolean);
  const bySen = ruleBool(state.rules, BY_SENIORITY, true);
  people.sort((a, b) => (bySen ? 0 : Number(b.market === bid.run.market) - Number(a.market === bid.run.market)) || hired(a.id).localeCompare(hired(b.id)));
  const w = people[0];
  bid.awardee = w.id; bid.status = 'awarded';
  bid.why = bySen ? `most senior bidder (hired ${hired(w.id)})` : `${w.market === bid.run.market ? 'same market' : 'other market'}, then seniority (hired ${hired(w.id)})`;
  return w;
}

/** Publish the award: the winner owns the run's stores from tomorrow. */
export function publishAward(state: SimState, bidId: number): boolean {
  const bid = bidState(state).bids.find(b => b.id === bidId);
  if (!bid || bid.status !== 'awarded' || !bid.awardee) return false;
  for (const id of bid.run.storeIds) state.week.master[id] = bid.awardee;
  bid.status = 'published';
  const w = state.merch.find(m => m.id === bid.awardee)!;
  raise(state, 'info', `Bid awarded to ${w.name}: ${bid.run.storeIds.length} stores from ${DAYS[Math.min(6, state.day + 1)]} on.`);
  return true;
}

export const br003RouteBiddingEngine: EngineFeature = {
  id: ID,
  title: 'Route bidding',
  description: 'Open a bid on a run, eligible people bid, award by seniority (or same market first), publish to make the winner the owner from tomorrow.',
  requirements: ['BR-003'],
  defaultOn: true,
  ruleDefaults: { [BY_SENIORITY]: true },
  settings: [{ key: BY_SENIORITY, label: 'Award bids by seniority', help: 'Off = same market first, then seniority', type: 'boolean', section: 'Bidding' }],
};
