import { describe, expect, it } from 'vitest';
import { newDay, recordDisplay, tasksFromPromotions, type EngineFeature, type Promotion, type SimState } from '../../engine';
import { seed } from '../../data';
import { br043PhotoReviewEngine, dashboard, queue, review, total } from './engine';

const p = (id: string, stores: string[]): Promotion => ({ id, version: 1, name: id, brand: 'B', productGroup: 'G', displayType: 'Endcap', fixture: 'Endcap', location: 'A7', products: [], instructions: '', start: 3, end: 6, checkEvery: 1, stores });
const feed: EngineFeature = { id: 'test-feed', title: '', description: '', requirements: [], defaultOn: true, onDayStart: s => { s.displays.tasks = tasksFromPromotions([p('a', ['s1', 's2']), p('b', ['s5'])], s.stores) } };
const day = () => newDay(seed, 'normal', { features: [feed, br043PhotoReviewEngine] });
const rec = (compliance: 'compliant' | 'non-compliant' | 'partially compliant', confidence = 90) => ({ name: 'p.jpg', at: 400, recognition: { productGroup: 'G', displayType: 'Endcap', compliance, confidence } });
const ev = (s: SimState, task: string, result: 'compliant' | 'absent' | 'partially compliant', photo?: ReturnType<typeof rec>) =>
  recordDisplay(s, { taskId: task, storeId: task.split('@')[1], action: 'setup', result, by: 'Ana', photo });

describe('br-043-photo-review [BR-043]', () => {
  it('queues photo results with suspected non-compliance first; reviewed ones leave', () => {
    const s = day();
    ev(s, 'a@s1', 'compliant', rec('compliant'));
    ev(s, 'a@s2', 'compliant', rec('non-compliant', 62));
    ev(s, 'b@s5', 'absent');                                         // no photo: not in the queue
    const q = queue(s);
    expect(q.map(x => x.ev.taskId)).toEqual(['a@s2', 'a@s1']);
    expect(q[0].why).toEqual(['recognition: non-compliant', 'reported compliant, recognition says non-compliant', 'low confidence (62%)']);
    review(s, q[0].ev, 'non-compliant', 'MSL North');
    expect(queue(s).map(x => x.ev.taskId)).toEqual(['a@s1']);
  });

  it('dashboard groups planned, due, done, absent and compliance by any dimension', () => {
    const s = day();
    ev(s, 'a@s1', 'compliant'); ev(s, 'a@s2', 'absent'); ev(s, 'b@s5', 'partially compliant');
    const byM = dashboard(s, 'merchandiser');
    expect(byM.map(r => [r.key, r.planned, r.completed, r.rate])).toEqual([['Marcus Bell', 1, 1, 0], ['Ana Ruiz', 2, 2, 0.5]]);
    expect(total(byM)).toMatchObject({ planned: 3, absent: 1, compliant: 1, rated: 3 });
    expect(dashboard(s, 'banner').map(r => r.key).sort()).toEqual(['Fresh Fare', 'ValuMart']);
    expect(dashboard(s, 'day')).toMatchObject([{ key: 'Thu', completed: 3, compliant: 1 }]);
  });
});
