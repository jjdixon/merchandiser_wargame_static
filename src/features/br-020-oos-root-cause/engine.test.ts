import { describe, expect, it } from 'vitest';
import { answerStep, newDay, storeById } from '../../engine';
import { seed } from '../../data';
import { CAUSES, STEP, br020OosRootCauseEngine, oosStep, ownerOf, reports } from './engine';

const day = () => newDay(seed, 'normal', { features: [br020OosRootCauseEngine] });

describe('br-020-oos-root-cause [BR-020]', () => {
  it('routes each cause to the role that owns it', () => {
    expect(ownerOf(CAUSES[0].cause)).toBe('Order management');
    expect(ownerOf(CAUSES[1].cause)).toBe('Transportation');
    expect(ownerOf('Merchandising — not filled last visit')).toBe('MSL');
  });

  it('a reported out-of-stock raises a routed alert and is recorded', () => {
    const s = day(), st = storeById(s, 's2')!;
    answerStep(s, st, STEP, { done: true, entries: [{ product: 'Wheat 24oz', cause: CAUSES[0].cause }] });
    expect(reports(s)).toHaveLength(1);
    expect(s.alerts[0].text).toContain('Routed to Order management');
  });

  it('"none found" records nothing; re-submitting replaces the store\'s reports', () => {
    const s = day(), st = storeById(s, 's2')!;
    answerStep(s, st, STEP, { done: true, entries: [] });
    expect(reports(s)).toHaveLength(0);
    answerStep(s, st, STEP, { done: true, entries: [{ product: 'Wheat 24oz', cause: CAUSES[3].cause }, { product: 'Snack cakes 12ct', cause: CAUSES[4].cause }] });
    answerStep(s, st, STEP, { done: true, entries: [{ product: 'Wheat 24oz', cause: CAUSES[3].cause }] });
    expect(reports(s)).toHaveLength(1);
  });

  it('simulated answers are repeatable and report sometimes, not always', () => {
    const s = day();
    const results = s.stores.map(st => oosStep().autoAnswer!(s, st).entries!.length);
    expect(results).toEqual(s.stores.map(st => oosStep().autoAnswer!(s, st).entries!.length));
    expect(results.some(n => n > 0)).toBe(true);
    expect(results.some(n => n === 0)).toBe(true);
  });
});
