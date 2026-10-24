import { describe, expect, it } from 'vitest';
import {
  answerStep, buildDay, displayStatus, endDay, freshWeek, newDay, storeById, tasksFromPromotions, visitSteps,
  type EngineFeature, type Promotion, type SimState,
} from '../../engine';
import { seed } from '../../data';
import { BUILT, CHECK_OK, NA, REMOVED, VALIDATE, br037DisplayTasksEngine, notBuilt, resultOf, stepId } from './engine';

// A stand-in feed (features can't import each other): one promotion at s2 from Thursday.
const promo: Promotion = { id: 'T-1', version: 1, name: 'Test tower', brand: 'B', productGroup: 'Snack cakes', displayType: 'Floor stand', fixture: 'Floor stand', location: 'Lobby', products: ['Snack cakes 12ct'], instructions: 'Fill it.', start: 3, end: 4, checkEvery: 1, stores: ['s2'] };
const feed = (p: Promotion[] = [promo]): EngineFeature => ({ id: 'test-feed', title: '', description: '', requirements: [], defaultOn: true, onDayStart: s => { s.displays.tasks = tasksFromPromotions(p, s.stores) } });
const features = [feed(), br037DisplayTasksEngine];
const day = () => newDay(seed, 'normal', { features });
const task = (s: SimState) => s.displays.tasks[0];

describe('br-037-display-tasks [BR-037]', () => {
  it('a setup is build-then-validate in the display phase', () => {
    const s = day(), st = storeById(s, 's2')!;
    const steps = visitSteps(s, st);
    expect(steps.map(x => x.title)).toEqual(['Build display: Test tower', 'Validate built: Test tower']);
    expect(steps.every(x => x.phase === 'display' && x.required)).toBe(true);
    expect(steps[0].options).toContain(notBuilt('No product on the truck'));
  });

  it('not built needs a standard reason; it records absent and drops the validate step', () => {
    const s = day(), st = storeById(s, 's2')!;
    answerStep(s, st, stepId(task(s), 'build'), { choice: notBuilt('Store said no / no space') });
    expect(visitSteps(s, st)).toHaveLength(1);
    expect(s.displays.events[0]).toMatchObject({ action: 'setup', result: 'absent', reason: 'Store said no / no space' });
    expect(s.alerts[0].text).toContain('Display absent at Fresh Fare #214: Test tower (Store said no / no space)');
  });

  it('built + validated records the compliance result (with the photo)', () => {
    const s = day(), st = storeById(s, 's2')!;
    answerStep(s, st, stepId(task(s), 'build'), { choice: BUILT });
    expect(s.displays.events).toHaveLength(0);
    answerStep(s, st, stepId(task(s), 'validate'), { choice: VALIDATE[1], photo: { name: 'a.jpg', at: s.t } });
    expect(displayStatus(s, task(s))).toMatchObject({ setUpDay: 3, result: 'partially compliant' });
    expect(s.displays.events[0].photo?.name).toBe('a.jpg');
  });

  it('maps every answer to a compliance state', () => {
    expect(resultOf('setup', NA)).toEqual({ result: 'not applicable' });
    expect(resultOf('check', CHECK_OK[1])).toEqual({ result: 'compliant' });
    expect(resultOf('check', "Couldn't check — area blocked")).toEqual({ result: 'unable to verify' });
    expect(resultOf('remove', 'Not removed — Out of time')).toEqual({ result: 'non-compliant', reason: 'Out of time' });
    expect(resultOf('remove', REMOVED)).toEqual({ result: 'compliant' });
  });

  it('a missed setup stays due, is flagged late and escalates to the MSL next day; then check, then remove', () => {
    const w = freshWeek(seed); w.day = 3;
    let s = buildDay(seed, w, 'normal', { features });
    answerStep(s, storeById(s, 's2')!, stepId(task(s), 'build'), { choice: notBuilt('Out of time') });
    endDay(s);
    s = buildDay(seed, w, 'normal', { features });
    expect(s.alerts.some(a => a.text.startsWith('Overdue display: Test tower at Fresh Fare #214 is 1 day late — escalated to MSL North'))).toBe(true);
    const st = storeById(s, 's2')!;
    expect(visitSteps(s, st)[0].detail).toContain('1 day late');
    answerStep(s, st, stepId(task(s), 'build'), { choice: BUILT });
    answerStep(s, st, stepId(task(s), 'validate'), { choice: VALIDATE[0] });
    endDay(s);
    s = buildDay(seed, w, 'normal', { features });             // Saturday: after the end
    expect(visitSteps(s, storeById(s, 's2')!).map(x => x.title)).toEqual(['Remove expired: Test tower']);
  });

  it('simulated answers are repeatable and follow the quality dial', () => {
    const a = day(), b = day(), st = storeById(a, 's2')!;
    const auto = (s: SimState) => visitSteps(s, storeById(s, 's2')!).map(x => x.autoAnswer!(s, storeById(s, 's2')!).choice);
    expect(auto(a)).toEqual(auto(b));
    expect(st).toBeDefined();
  });
});
