import { describe, expect, it } from 'vitest';
import { buildDay, endDay, freshWeek, setRule } from '../../engine';
import { seed } from '../../data';
import { award, bidState, br003RouteBiddingEngine, eligible, openBid, placeBid, publishAward, runs, simulateBids } from './engine';

const opts = { features: [br003RouteBiddingEngine] };
const day = () => { const w = freshWeek(seed); return { w, s: buildDay(seed, w, 'normal', opts) } };

describe('br-003-route-bidding [BR-003]', () => {
  it('each person\'s regular stores form a run with its route types and market', () => {
    const { s } = day();
    const lui = runs(s).find(r => r.owner === 'lui')!;
    expect(lui.routeTypes.sort()).toEqual(['LF', 'Traditional', 'Xpress']);
    expect(lui.market).toBe('South');
  });

  it('only people qualified for every route type on the run may bid', () => {
    const { s } = day();
    const run = runs(s).find(r => r.owner === 'lui')!;
    expect(eligible(s, run).map(m => m.id)).toEqual(['mar', 'ros']);
    const bid = openBid(s, 'lui')!;
    expect(placeBid(s, bid.id, 'dee', true)).toBe(false);
    expect(placeBid(s, bid.id, 'ros', true)).toBe(true);
  });

  it('awards by seniority, or same market first; publishing changes owners from tomorrow', () => {
    const { w, s } = day();
    const bid = openBid(s, 'ana')!;                     // North LF + Traditional run
    placeBid(s, bid.id, 'dee', true); placeBid(s, bid.id, 'ros', true);
    expect(award(s, bid.id)!.id).toBe('dee');           // hired 2012
    const bid2 = openBid(s, 'mar')!;
    setRule(s.rules, 'br003.bySeniority', false);
    placeBid(s, bid2.id, 'dee', true); placeBid(s, bid2.id, 'ros', true);
    expect(award(s, bid2.id)!.id).toBe('ros');          // same market (North) first
    expect(publishAward(s, bid.id)).toBe(true);
    endDay(s);
    const tue = buildDay(seed, w, 'normal', opts);
    expect(tue.stores.filter(x => ['s1', 's2', 's4'].includes(x.id)).every(x => x.assign === 'dee')).toBe(true);
  });

  it('simulated bids are repeatable; no bidders means no award', () => {
    const { s } = day();
    const bid = openBid(s, 'dee')!;
    expect(award(s, bid.id)).toBeNull();
    simulateBids(s, bid.id);
    const first = [...bidState(s).bids[0].bidders];
    simulateBids(s, bid.id);
    expect(bidState(s).bids[0].bidders).toEqual(first);
  });
});
