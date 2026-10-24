import { describe, expect, it } from 'vitest';
import { newDay, recordDisplay, storeById, tasksFromPromotions, type EngineFeature, type Promotion } from '../../engine';
import { seed } from '../../data';
import { br022DisplayAwarenessEngine, displaysFor } from './engine';

const p = (id: string, start: number, end: number): Promotion => ({ id, version: 1, name: id, brand: 'B', productGroup: 'G', displayType: 'Endcap', fixture: 'Endcap', location: 'A7', products: [], instructions: '', start, end, checkEvery: 2, stores: ['s2'] });
const feed: EngineFeature = { id: 'test-feed', title: '', description: '', requirements: [], defaultOn: true,
  onDayStart: s => { s.displays.tasks = tasksFromPromotions([p('new', 3, 6), p('old', -5, 6), p('done', -9, 1), p('later', 5, 6)], s.stores) } };
const day = () => newDay(seed, 'normal', { features: [feed, br022DisplayAwarenessEngine] });

describe('br-022-display-awareness [BR-022]', () => {
  it('lists what each store has and what is due today', () => {
    const s = day(), list = displaysFor(s, storeById(s, 's2')!);
    expect(list.map(d => [d.task.promoId, d.phase, d.due])).toEqual([
      ['new', 'sold-in', 'setup'], ['old', 'active', 'check'], ['done', 'expired', 'remove'],
    ]);
    expect(displaysFor(s, storeById(s, 's3')!)).toEqual([]);
  });

  it('shows a display as done once today\'s visit recorded it', () => {
    const s = day(), st = storeById(s, 's2')!;
    const t = s.displays.tasks.find(x => x.promoId === 'new')!;
    recordDisplay(s, { taskId: t.id, storeId: 's2', action: 'setup', result: 'compliant', by: 'x' });
    expect(displaysFor(s, st).find(d => d.task.promoId === 'new')).toMatchObject({ doneToday: true, phase: 'active' });
  });
});
