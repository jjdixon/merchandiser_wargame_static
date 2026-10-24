// BR-020 Out-of-stock and void root-cause capture.
// The last phase of the visit asks for out-of-stocks: product + root cause, or
// "none found". Each one is routed to the role that owns that cause (e.g. order
// fill → order management, merchandising → the MSL) as an alert, and stands in for
// the business's "trigger a workflow in the inventory/ordering app".
// Simulated merchandisers report one about a quarter of the time.
import {
  featureState, fmt, hash01, raise,
  type EngineFeature, type SimState, type Store, type VisitStep,
} from '../../engine';
import DATA from './oos.json';

export const ID = 'br-020-oos-root-cause';
export const STEP = `${ID}:oos`;
export const PRODUCTS: string[] = DATA.products;
export const CAUSES = DATA.causes as Array<{ cause: string; owner: string }>;
export const ownerOf = (cause: string) => CAUSES.find(c => c.cause === cause)?.owner ?? 'MSL';

export interface OosReport { storeId: string; storeName: string; market: string; product: string; cause: string; owner: string; at: number; auto: boolean }
export const reports = (state: SimState) => featureState<OosReport[]>(state, ID, () => []);

export function oosStep(): VisitStep {
  return {
    id: STEP, featureId: ID, phase: 'oos', order: 10, kind: 'entries', required: true, needsProduct: true,
    title: 'Out-of-stocks', detail: 'Any empty spots or voids? Add each with its cause, or confirm none.',
    fields: [{ id: 'product', label: 'Product', options: PRODUCTS }, { id: 'cause', label: 'Cause', options: CAUSES.map(c => c.cause) }],
    autoAnswer: (state, s) => {
      const u = hash01(`${state.scenario}|${s.id}|oos`);
      if (u >= 0.25) return { done: true, entries: [] };
      return { done: true, entries: [{
        product: PRODUCTS[Math.floor(hash01(`${s.id}|p`) * PRODUCTS.length)],
        cause: CAUSES[Math.floor(hash01(`${s.id}|c`) * CAUSES.length)].cause,
      }] };
    },
  };
}

export function onOosAnswered(state: SimState, s: Store, entries: Array<Record<string, string>>, auto: boolean): void {
  const list = reports(state);
  // Re-submitting replaces this store's reports.
  for (let i = list.length - 1; i >= 0; i--) if (list[i].storeId === s.id) list.splice(i, 1);
  for (const e of entries) {
    const r: OosReport = { storeId: s.id, storeName: s.name, market: s.market, product: e.product, cause: e.cause, owner: ownerOf(e.cause), at: state.t, auto };
    list.push(r);
    raise(state, 'warn', `Out-of-stock at ${s.name}: ${r.product} — ${r.cause.split(' — ')[0].toLowerCase()}. Routed to ${r.owner}${s.market && r.owner === 'MSL' ? ` (${s.market})` : ''} at ${fmt(state.t)}.`);
  }
}

export const br020OosRootCauseEngine: EngineFeature = {
  id: ID,
  title: 'Out-of-stock root cause',
  description: 'Last visit step: report out-of-stocks with a root cause; each is routed to the role that owns the cause.',
  requirements: ['BR-020'],
  defaultOn: true,
  visitSteps: () => [oosStep()],
  onStepAnswered(state, s, step, answer) {
    if (step.id === STEP && answer.done) onOosAnswered(state, s, answer.entries ?? [], !!answer.auto);
  },
};
