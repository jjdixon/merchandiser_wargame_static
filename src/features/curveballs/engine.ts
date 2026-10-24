// Curveballs: the disruptions a facilitator throws during a war game.
// Each one uses core event primitives (src/engine/sim.ts) and raises an alert.
// Other features can contribute their own curveballs the same way.
import {
  callOut, delayTruck, extraVisit, fmt, heavierLoad, merchById, raise, storeById,
  type Curveball, type EngineFeature, type SimState,
} from '../../engine';

const storeOpts = (state: SimState, keep: (t: number, s: SimState['stores'][number]) => boolean) =>
  state.stores.filter(s => keep(state.t, s)).map(s => ({ value: s.id, label: s.name }));

export const truckLate: Curveball = {
  id: 'truck',
  label: 'Truck late',
  // Only before work starts at that stop.
  targets: state => storeOpts(state, (t, s) => !s.pullUp && !(s.lock && t >= s.lock.start)),
  params: [{ id: 'minutes', label: 'Delay', default: '60', options: [
    { value: '30', label: '+30 min' }, { value: '60', label: '+60 min' }, { value: '120', label: '+2 hrs' },
  ] }],
  apply(state, target, params) {
    const s = storeById(state, target);
    if (!s) return;
    const d = Number(params.minutes ?? 60);
    delayTruck(state, s, d);
    raise(state, 'warn', `Dispatch: truck to ${s.name} running ${d} min late — now ${fmt(s.eta)}.`);
  },
};

export const heavyLoad: Curveball = {
  id: 'heavy',
  label: 'Heavier load than ordered',
  targets: state => storeOpts(state, (t, s) => !(s.lock && t >= s.lock.end)),
  apply(state, target) {
    const s = storeById(state, target);
    if (!s) return;
    const add = heavierLoad(state, s);
    raise(state, 'warn', `${s.name}: order came in ${add} units heavier (${s.trays} trays · ${s.cases} cases now).`);
  },
};

export const callOutCb: Curveball = {
  id: 'callout',
  label: 'Merchandiser calls out / goes home',
  targets: state => state.merch.filter(m => !m.out).map(m => ({ value: m.id, label: m.name })),
  apply(state, target) {
    const m = merchById(state, target);
    if (m) callOut(state, m);
  },
};

export const extraVisitCb: Curveball = {
  id: 'extra',
  label: 'Store requests extra visit',
  // Not on stops that are themselves extra visits.
  targets: state => storeOpts(state, (_t, s) => !s.id.startsWith('x')),
  apply(state, target) {
    const b = storeById(state, target);
    if (!b) return;
    const n = extraVisit(state, b);
    raise(state, 'bad', `${b.name} manager called: wants an extra visit today (≈${n.trays} trays · ${n.cases} cases, done by ${fmt(n.win)}).`);
  },
};

export const curveballsEngine: EngineFeature = {
  id: 'curveballs',
  title: 'Curveballs',
  description: 'Late trucks, heavier loads, call-outs and extra-visit requests the facilitator can throw.',
  requirements: ['BR-004', 'BR-008', 'BR-014', 'BR-017'],
  defaultOn: true,
  curveballs: [truckLate, heavyLoad, callOutCb, extraVisitCb],
};
