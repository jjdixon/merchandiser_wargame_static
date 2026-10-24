import { describe, expect, it } from 'vitest';
import { newDay } from '../../engine';
import { seed } from '../../data';
import { accessFor, roleOptions } from './roles';

const s = newDay(seed, 'normal');

describe('br-001-role-access [BR-001]', () => {
  it('offers facilitator, portal roles, an MSL per market and every field worker', () => {
    const ids = roleOptions(s).map(r => r.id);
    expect(ids).toEqual(expect.arrayContaining(['facilitator', 'scheduler', 'manager', 'msl:North', 'msl:South', 'field:ana', 'field:ros', 'field:sam']));
  });

  it('facilitator has no limits', () => {
    expect(accessFor(s, 'facilitator')).toBeNull();
  });

  it('a merchandiser sees only their own phone and their own stops', () => {
    const a = accessFor(s, 'field:ana')!;
    expect(a.views).toEqual(['merch']);
    expect(a.lockMerch).toBe('ana');
    expect(s.merch.filter(a.merch!).map(m => m.id)).toEqual(['ana']);
    expect(s.stores.filter(a.store!).every(st => st.assign === 'ana')).toBe(true);
  });

  it('an MSL sees only their market', () => {
    const a = accessFor(s, 'msl:South')!;
    expect(s.merch.filter(a.merch!).every(m => m.market === 'South')).toBe(true);
    expect(s.stores.filter(a.store!).length).toBe(7);
    expect(a.views).not.toContain('rules');
  });

  it('portal roles never see the facilitator-only rules screen', () => {
    expect(accessFor(s, 'scheduler')!.views).not.toContain('rules');
    expect(accessFor(s, 'manager')!.views).not.toContain('rules');
  });

  it('an unknown role falls back to no limits rather than locking you out', () => {
    expect(accessFor(s, 'field:nobody')).toBeNull();
  });
});
