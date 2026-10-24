import { describe, expect, it } from 'vitest';
import { newDay, plan, setRule, storeById, tick, workMin } from '../../engine';
import { seed } from '../../data';
import { br024WorkStandardsEngine, casesPerHour, classKey, storeClass } from './engine';

const day = () => newDay(seed, 'normal', { features: [br024WorkStandardsEngine] });
const bare = () => newDay(seed, 'normal');

describe('br-024-work-standards [BR-024]', () => {
  it('standard stores use the global labor standard unchanged', () => {
    const s = day(), b = bare();
    expect(workMin(s, storeById(s, 's2')!)).toBe(workMin(b, storeById(b, 's2')!));
  });

  it('complex and simple stores scale per-case and fixed minutes', () => {
    const s = day(), r = s.rules, s1 = storeById(s, 's1')!, s3 = storeById(s, 's3')!;
    expect(workMin(s, s1)).toBeCloseTo(r.fixed * 1.6 + s1.cases * r.mpc * 1.2);
    expect(workMin(s, s3)).toBeCloseTo(r.fixed * 0.7 + s3.cases * r.mpc * 0.85);
  });

  it('changing a store\'s class changes its plan', () => {
    const s = day(), s2 = storeById(s, 's2')!;
    const before = plan(s, s.merch[0]).stops.find(x => x.s.id === 's2')!.work;
    setRule(s.rules, classKey('s2'), 2);
    expect(storeClass(s, s2)).toBe(2);
    expect(plan(s, s.merch[0]).stops.find(x => x.s.id === 's2')!.work).toBeGreaterThan(before);
  });

  it('editing a class percentage changes every store in that class', () => {
    const s = day(), s1 = storeById(s, 's1')!, s5 = storeById(s, 's5')!;
    const a = workMin(s, s1), b = workMin(s, s5);
    setRule(s.rules, 'br024.complex.casePct', 150);
    expect(workMin(s, s1)).toBeGreaterThan(a);
    expect(workMin(s, s5)).toBeGreaterThan(b);
  });

  it('a stop already started keeps its labor time when the class changes', () => {
    const s = day();
    tick(s, 400 - s.t);
    const locked = storeById(s, 's1')!.lock!.work;
    setRule(s.rules, classKey('s1'), 0);
    expect(plan(s, s.merch[0]).stops[0].work).toBe(locked);
  });

  it('extra visits default to Standard and report cases per hour', () => {
    const s = day();
    expect(storeClass(s, { ...storeById(s, 's1')!, id: 'x1' })).toBe(1);
    expect(casesPerHour(s, storeById(s, 's2')!)).toBeGreaterThan(0);
  });
});
