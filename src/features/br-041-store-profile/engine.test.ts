import { describe, expect, it } from 'vitest';
import { buildDay, endDay, freshWeek, newDay, recordDisplay, storeById, tasksFromPromotions, type EngineFeature, type Promotion } from '../../engine';
import { seed } from '../../data';
import { addNote, br041StoreProfileEngine, notesFor, openTasks, profileOf, resolveNote, storeCompliance } from './engine';

const p: Promotion = { id: 'T', version: 1, name: 'Tower', brand: 'B', productGroup: 'G', displayType: 'Stand', fixture: 'Stand', location: 'Lobby', products: [], instructions: '', start: 2, end: 6, checkEvery: 1, stores: ['s2'] };
const feed: EngineFeature = { id: 'test-feed', title: '', description: '', requirements: [], defaultOn: true, onDayStart: s => { s.displays.tasks = tasksFromPromotions([p], s.stores) } };
const features = [feed, br041StoreProfileEngine];

describe('br-041-store-profile [BR-041]', () => {
  it('every seed store has a (fictional) profile', () => {
    for (const s of seed.stores) expect(profileOf(s.id)?.contacts.length).toBeGreaterThan(0);
  });

  it('notes carry over to the next day and respect visibility', () => {
    const w = freshWeek(seed);
    let s = buildDay(seed, w, 'normal', { features });
    addNote(s, { storeId: 's3', category: 'Backroom', text: 'Key is at the service desk', author: 'Ana Ruiz', visibility: 'everyone', followUp: false });
    addNote(s, { storeId: 's3', category: 'Relationship', text: 'Manager prefers email', author: 'MSL North', visibility: 'leaders', followUp: true });
    endDay(s);
    s = buildDay(seed, w, 'normal', { features });
    expect(notesFor(s, { storeId: 's3', leader: true }).map(n => n.text)).toEqual(['Manager prefers email', 'Key is at the service desk']);
    expect(notesFor(s, { storeId: 's3', leader: false }).map(n => n.text)).toEqual(['Key is at the service desk']);
    expect(addNote(s, { storeId: 's3', category: 'Other', text: '   ', author: 'x', visibility: 'everyone', followUp: false })).toBeNull();
  });

  it('search covers text, category and author across stores; follow-ups can be closed', () => {
    const s = newDay(seed, 'normal', { features });
    expect(notesFor(s, { leader: true, q: 'pallet' }).map(n => n.storeId)).toEqual(['s11']);
    const n = notesFor(s, { leader: true, q: 'endcap header' })[0];
    expect(n.followUp).toBe(true);
    resolveNote(s, n.id);
    expect(notesFor(s, { leader: true, q: 'endcap header' })[0].done).toBe(true);
  });

  it('shows open display tasks (with lateness) and display compliance', () => {
    const w = freshWeek(seed); w.day = 3;
    const s = buildDay(seed, w, 'normal', { features }), st = storeById(s, 's2')!;
    expect(openTasks(s, st)).toMatchObject([{ action: 'check' }]);           // started Wed, before the week's first day → carried in
    expect(storeCompliance(s, 's2')).toEqual({ rate: 1, rated: 1 });
    recordDisplay(s, { taskId: s.displays.tasks[0].id, storeId: 's2', action: 'check', result: 'absent', by: 'x' });
    expect(storeCompliance(s, 's2')).toEqual({ rate: 0, rated: 1 });
  });
});
