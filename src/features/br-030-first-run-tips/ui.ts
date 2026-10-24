// The tip banner (view.top slot) and "show tips again" (rules screen).
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, tipFor } from './engine';

const KEY = 'mwg.tips.dismissed';
function load(): Record<string, true> { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
let dismissed = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(dismissed)) } catch { /* private mode: keep in memory */ } }

export const panels: Panel[] = [
  {
    slot: 'view.top',
    render(ctx) {
      const tip = tipFor(ctx.view);
      if (!tip || dismissed[ctx.view]) return '';
      return `<div class="panel" role="note" style="border-left:4px solid var(--work)"><div class="pb" style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between">
        <div><b>Tip · ${esc(tip.title)}</b><div class="muted" style="font-size:13.5px">${esc(tip.text)}</div></div>
        <button class="btn sm" data-act="${ID}:dismiss" data-tab="${esc(ctx.view)}" aria-label="Dismiss tip">Got it</button></div></div>`;
    },
  },
  {
    slot: 'rules.after',
    render() {
      const n = Object.keys(dismissed).length;
      return n ? `<section class="panel"><div class="pb ctl" style="justify-content:space-between"><span class="muted">${n} tip${n > 1 ? 's' : ''} dismissed (BR-030)</span><button class="btn sm" data-act="${ID}:reset">Show tips again</button></div></section>` : '';
    },
  },
];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  dismiss(app, el) { dismissed[el.dataset.tab!] = true; save(); app.refresh() },
  reset(app) { dismissed = {}; save(); app.toast('Tips are back on every tab'); app.refresh() },
};
