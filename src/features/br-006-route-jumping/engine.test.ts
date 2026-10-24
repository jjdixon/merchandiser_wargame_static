import { describe, expect, it } from 'vitest';
import { callOut, newDay, plan, storeById } from '../../engine';
import { seed } from '../../data';
import { br006RouteJumpingEngine, helpersFor, risks, sendHelp } from './engine';

const day = () => newDay(seed, 'normal', { features: [br006RouteJumpingEngine] });

describe('br-006-route-jumping [BR-006]', () => {
  it('recommends the route jumper first, then the earliest qualified helper', () => {
    const s = day();
    const h = helpersFor(s, storeById(s, 's9')!);      // South LF store
    expect(h[0]).toMatchObject({ merchId: 'sam', jumper: true });
    expect(h.every(x => x.merchId !== 'dee')).toBe(true);   // not the owner
  });

  it('only qualified people are suggested (Xpress needs Xpress)', () => {
    const s = day();
    expect(helpersFor(s, storeById(s, 's14')!).every(x => s.merch.find(m => m.id === x.merchId)!.routeTypes.includes('Xpress'))).toBe(true);
  });

  it('uncovered stops after a call-out show up as risks with helpers', () => {
    const s = day();
    callOut(s, s.merch.find(m => m.id === 'dee')!);
    const r = risks(s).filter(x => x.reason === 'uncovered');
    expect(r.length).toBeGreaterThan(0);
    sendHelp(s, r[0].store.id, r[0].helpers[0].merchId);
    expect(storeById(s, r[0].store.id)!.assign).toBe(r[0].helpers[0].merchId);
  });

  it('sending help splits the work and the owner finishes sooner', () => {
    const s = day(), ana = s.merch[0];
    const before = plan(s, ana).stops.find(x => x.s.id === 's1')!.end;
    const n = sendHelp(s, 's1', 'ros')!;
    expect(n.assign).toBe('ros');
    expect(plan(s, ana).stops.find(x => x.s.id === 's1')!.end).toBeLessThan(before);
  });
});
