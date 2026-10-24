// The choice card: on the phone for that merchandiser, and on the Supervisor view.
import { fmt, hrs, merchById, storeById, type SimState } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, OPTION_LABEL, choose, decisionFor, type Decision, type OptionId } from './engine';

function card(d: Decision, compact: boolean): string {
  const base = d.options[0];
  const opts = d.options.map(o => {
    const delta = Math.round(o.finish - base.finish);
    return `<button class="btn" data-act="${ID}:choose" data-m="${esc(d.merchId)}" data-store="${esc(d.store.id)}" data-opt="${o.id}" style="flex-direction:column;align-items:flex-start;gap:2px;flex:1 1 10em;white-space:normal;text-align:left${o.id === d.best ? ';border-color:var(--ok)' : ''}">
      <b>${OPTION_LABEL[o.id]}${o.id === d.best ? ' · best' : ''}</b>
      <span class="muted" style="font-size:12px">Finish ${fmt(o.finish)}${o.id !== 'wait' && delta ? ` (${delta < 0 ? '−' : '+'}${Math.abs(delta)}m)` : ''} · wait ${o.wait}m · ${o.late ? `<span class="flag late">${o.late} late</span>` : 'none late'} · ${hrs(o.paid)}</span></button>`;
  }).join('');
  return `<div class="${compact ? '' : 'cur'}" style="gap:8px;display:flex;flex-direction:column${compact ? ';padding:10px 14px;border-bottom:1px solid var(--soft)' : ';border-color:var(--wait)'}">
    <div><span class="lbl" style="color:var(--wait)">Truck not in yet</span><div style="font-weight:600">${esc(d.store.name)}: you'd wait ${d.waitMin} min</div>
    <div class="muted" style="font-size:12.5px">Truck ${fmt(d.store.eta)}. Pick one before you leave.</div></div>
    <div class="ctl" style="gap:6px;align-items:stretch">${opts}</div></div>`;
}

const decisions = (state: SimState) => state.merch.map(m => decisionFor(state, m)).filter((d): d is Decision => !!d);

export const panels: Panel[] = [
  {
    slot: 'merch.top',
    order: 110,   // right under the Next card
    render({ state, selM }) {
      const m = merchById(state, selM);
      const d = m && decisionFor(state, m);
      return d ? card(d, false) : '';
    },
  },
  {
    slot: 'super.main',
    order: 5,
    render({ state, scope }) {
      const list = decisions(state).filter(d => scope.merch(merchById(state, d.merchId)!));
      if (!list.length) return '';
      return `<div class="panel" style="border-color:var(--wait)"><div class="ph"><h2>Late-truck decisions</h2><span class="muted" style="font-size:12.5px">BR-009 · choose for the merchandiser, or let them choose</span></div>
        ${list.map(d => `<div style="padding:6px 14px 0" class="muted">${esc(merchById(state, d.merchId)!.name)}</div>${card(d, true)}`).join('')}</div>`;
    },
  },
];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  choose(app, el) {
    const m = merchById(app.state, el.dataset.m!), s = storeById(app.state, el.dataset.store!);
    if (!m || !s) return;
    choose(app.state, m, s, el.dataset.opt as OptionId, app.viewName === 'Merchandiser' ? m.name : 'Supervisor');
    app.toast(OPTION_LABEL[el.dataset.opt as OptionId]);
    app.refresh();
  },
};
