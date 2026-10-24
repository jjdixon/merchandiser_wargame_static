import { describe, expect, it } from 'vitest';
import { buildDay, endDay, freshWeek, newDay, recordDisplay, tasksFromPromotions, type EngineFeature, type Promotion } from '../../engine';
import { seed } from '../../data';
import { br040DisplayComplianceEngine, override, record, records, summarize } from './engine';

const p = (id: string, start: number, end: number): Promotion => ({ id, version: 1, name: id, brand: 'B', productGroup: 'G', displayType: 'Endcap', fixture: 'Endcap', location: 'A7', products: [], instructions: '', start, end, checkEvery: 1, stores: ['s2'] });
const promos = [p('a', 3, 4), p('b', 3, 6), p('c', -5, 6), p('d', 5, 6)];
const feed: EngineFeature = { id: 'test-feed', title: '', description: '', requirements: [], defaultOn: true, onDayStart: s => { s.displays.tasks = tasksFromPromotions(promos, s.stores) } };
const features = [feed, br040DisplayComplianceEngine];
const task = (s: ReturnType<typeof newDay>, id: string) => s.displays.tasks.find(t => t.promoId === id)!;

describe('br-040-display-compliance [BR-040]', () => {
  it('moves a display through its lifecycle with expected vs actual days', () => {
    const w = freshWeek(seed); w.day = 3;
    let s = buildDay(seed, w, 'normal', { features });
    expect(record(s, task(s, 'a'))).toMatchObject({ phase: 'due', result: null, expectedSetup: 3 });
    expect(record(s, task(s, 'c'))).toMatchObject({ phase: 'up', carriedIn: true, result: 'compliant' });
    recordDisplay(s, { taskId: task(s, 'a').id, storeId: 's2', action: 'setup', result: 'absent', reason: 'Out of time', by: 'Ana' });
    endDay(s);
    s = buildDay(seed, w, 'normal', { features });
    expect(record(s, task(s, 'a'))).toMatchObject({ phase: 'overdue', result: 'absent' });
    recordDisplay(s, { taskId: task(s, 'a').id, storeId: 's2', action: 'setup', result: 'compliant', by: 'Ana', photo: { name: 'x.jpg', at: 400 } });
    expect(record(s, task(s, 'a'))).toMatchObject({ phase: 'up', actualSetup: 4, daysUp: 1, photos: [{ name: 'x.jpg' }] });
    endDay(s);
    s = buildDay(seed, w, 'normal', { features });
    expect(record(s, task(s, 'a')).phase).toBe('expired');
    recordDisplay(s, { taskId: task(s, 'a').id, storeId: 's2', action: 'remove', result: 'compliant', by: 'Ana' });
    expect(record(s, task(s, 'a'))).toMatchObject({ phase: 'removed', actualRemoval: 5, expectedRemoval: 5, daysUp: 1 });
    expect(record(s, task(s, 'a')).history).toHaveLength(3);
  });

  it('compliance rate counts compliant over rated states; open ones are separate', () => {
    const s = newDay(seed, 'normal', { features });
    recordDisplay(s, { taskId: task(s, 'a').id, storeId: 's2', action: 'setup', result: 'partially compliant', by: 'x' });
    const sum = summarize(records(s));
    expect(sum).toMatchObject({ rated: 2, compliant: 1, rate: 0.5, open: 1 });     // c carried in, a partial, b open; d not started
  });

  it('a manager override wins and is marked reviewed', () => {
    const s = newDay(seed, 'normal', { features });
    recordDisplay(s, { taskId: task(s, 'b').id, storeId: 's2', action: 'setup', result: 'compliant', by: 'x' });
    override(s, task(s, 'b').id, 'non-compliant', 'MSL North', 'sign missing in photo');
    expect(record(s, task(s, 'b'))).toMatchObject({ result: 'non-compliant', reviewed: true });
  });
});
