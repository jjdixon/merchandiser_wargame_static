import { describe, expect, it } from 'vitest';
import { freshWeek, buildDay, newDay } from '../../engine';
import { seed } from '../../data';
import { br036PromotionFeedEngine, feed, loadPasted, parseDay, parseSheet, promotions, TEMPLATE } from './engine';

const day = () => newDay(seed, 'normal', { features: [br036PromotionFeedEngine] });

describe('br-036-promotion-feed [BR-036]', () => {
  it('turns seeded promotions into one task per matching store', () => {
    const s = day();
    expect(s.displays.tasks.length).toBeGreaterThan(promotions(s).length);
    expect(s.displays.tasks.filter(t => t.promoId === 'P-102').map(t => t.storeId)).toEqual(['s1', 's11']);
    const vm = seed.stores.filter(x => x.name.startsWith('ValuMart')).map(x => x.id);
    expect(s.displays.tasks.filter(t => t.promoId === 'P-101').map(t => t.storeId)).toEqual(vm);
  });

  it('reads days by name or number', () => {
    expect(parseDay('Thu')).toBe(3); expect(parseDay('sunday')).toBe(6); expect(parseDay('-2')).toBe(-2); expect(parseDay('x')).toBeNull();
  });

  it('parses a pasted sheet (tabs or commas) and reports bad rows', () => {
    const r = parseSheet(TEMPLATE);
    expect(r.errors).toEqual([]);
    expect(r.promotions[0]).toMatchObject({ id: 'P-201', start: 4, end: 6, banners: ['ValuMart'], products: ['Hamburger buns 8ct', 'Hot dog buns 8ct'] });
    expect(parseSheet('id,name,start,end\nX,Thing,Fri,Sun\nY,,Fri,Sun').errors).toEqual(['Row 3: id and name are required']);
    expect(parseSheet('name,start\nA,Mon').errors).toContain('Missing column "id"');
  });

  it('pasting adds new promotions and versions changed ones; tasks follow', () => {
    const s = day();
    const r1 = loadPasted(s, parseSheet(TEMPLATE).promotions);
    expect(r1).toEqual({ added: 1, updated: 0, unchanged: 0 });
    expect(s.displays.tasks.some(t => t.promoId === 'P-201')).toBe(true);
    const changed = parseSheet('id\tname\tstart\tend\tstores\nP-103\tSnack cake tower\tThu\tSun\ts2').promotions;
    expect(loadPasted(s, changed)).toEqual({ added: 0, updated: 1, unchanged: 0 });
    expect(promotions(s).find(p => p.id === 'P-103')!.version).toBe(2);
    expect(feed(s).log.at(-1)!.changed).toContain('end');
    expect(loadPasted(s, changed)).toEqual({ added: 0, updated: 0, unchanged: 1 });
  });

  it('pasted promotions carry to the next day', () => {
    const w = freshWeek(seed);
    const s = buildDay(seed, w, 'normal', { features: [br036PromotionFeedEngine] });
    loadPasted(s, parseSheet(TEMPLATE).promotions);
    w.day = 1;
    expect(buildDay(seed, w, 'normal', { features: [br036PromotionFeedEngine] }).displays.tasks.some(t => t.promoId === 'P-201')).toBe(true);
  });
});
