import { describe, expect, it } from 'vitest';
import { getRule, isCoreRule, newDay } from '../../engine';
import { seed } from '../../data';
import { payLaborRulesEngine, settings } from './engine';

describe('pay-labor-rules [BR-007 BR-012 BR-024]', () => {
  it('every setting edits a real core rule', () => {
    const s = newDay(seed, 'normal', { features: [payLaborRulesEngine] });
    for (const x of settings) {
      expect(isCoreRule(x.key)).toBe(true);
      expect(typeof getRule(s.rules, x.key)).toBe(x.type);
    }
  });
  it('is registered as locked, since every screen depends on it', () => {
    expect(payLaborRulesEngine.locked).toBe(true);
  });
});
