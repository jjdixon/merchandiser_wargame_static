// Scorecards tab (manager comparison) and "Your scorecard" on the phone.
import { merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel, ViewCtx, ViewDef } from '../../app/feature';
import { ID, card, cards, daysCounted, goals, kpis, meets, sum, weekCards, type Card, type Kpis } from './engine';

let period: 'today' | 'week' = 'today';
const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const fmtK = (k: keyof Kpis, v: number | null) => (k === 'uph' ? (v == null ? '—' : v.toFixed(0)) : pct(v));
const COLS: Array<[keyof Kpis, string]> = [['adherence', 'On time'], ['completion', 'Completion'], ['uph', 'Units / hr'], ['steps', 'Steps done'], ['displays', 'Displays']];

function cell(ctx: ViewCtx, k: keyof Kpis, v: number | null): string {
  const ok = meets(k, v, ctx.state);
  return `<td class="n">${ok == null ? '<span class="muted">—</span>' : `<span class="flag ${ok ? 'ok' : 'late'}">${fmtK(k, v)}</span>`}</td>`;
}
function row(ctx: ViewCtx, c: Card, bold = false): string {
  const k = kpis(c);
  return `<tr${bold ? ' style="font-weight:600"' : ''}><td>${esc(c.name)}${c.role && c.role !== 'merchandiser' ? ` <span class="muted" style="font-size:12px">${esc(c.role)}</span>` : ''}</td>
    <td class="n">${c.done}/${c.stops}</td>${COLS.map(([key]) => cell(ctx, key, k[key])).join('')}
    <td class="n">${c.oos}</td><td class="n">${c.exceptions || ''}</td><td class="n">${c.paidH.toFixed(1)}</td><td class="n">${c.otH ? c.otH.toFixed(1) : ''}</td><td class="n">${c.miles.toFixed(0)}</td></tr>`;
}

export const scorecardsView: ViewDef = {
  id: 'scorecards',
  label: 'Scorecards',
  render(ctx: ViewCtx) {
    const list = period === 'today' ? cards(ctx.state, ctx.scope.merch) : weekCards(ctx.state, ctx.scope.merch);
    const g = goals(ctx.state);
    const goalRow = `<tr class="muted"><td>Goal</td><td></td>${COLS.map(([k]) => `<td class="n">${fmtK(k, g[k])}</td>`).join('')}<td colspan="5"></td></tr>`;
    return `<section class="panel"><div class="ph"><h2>Scorecards</h2>
        <div class="ctl" style="gap:6px"><button class="btn sm${period === 'today' ? ' pri' : ''}" data-act="${ID}:period" data-p="today">Today</button><button class="btn sm${period === 'week' ? ' pri' : ''}" data-act="${ID}:period" data-p="week">Week to date</button></div></div>
      <div class="pb note" style="padding-bottom:0">${period === 'week' ? `Days counted: ${esc(daysCounted(ctx.state).join(', '))}. ` : 'Finished stops so far today. '}Goals are drafts (Pay &amp; labor rules → Scorecard goals) until the business approves KPI definitions. Sales isn't simulated.</div>
      <div class="tw"><table><thead><tr><th>Person</th><th class="n">Stops</th>${COLS.map(([, l]) => `<th class="n">${l}</th>`).join('')}<th class="n">OOS found</th><th class="n">Exceptions</th><th class="n">Paid h</th><th class="n">OT h</th><th class="n">Miles</th></tr></thead>
        <tbody>${goalRow}${list.map(c => row(ctx, c)).join('')}${list.length > 1 ? row(ctx, sum(list, 'Team')) : ''}</tbody></table></div></section>`;
  },
};

export const panels: Panel[] = [{
  slot: 'merch.after',
  order: 2,
  render(ctx) {
    const m = merchById(ctx.state, ctx.selM);
    if (!m) return '';
    const c = card(ctx.state, m), k = kpis(c), g = goals(ctx.state);
    if (!c.stops) return '';
    const item = (key: keyof Kpis, label: string) => {
      const ok = meets(key, k[key], ctx.state);
      return `<div class="kpi${ok === false ? ' bad' : ''}"><span class="lbl">${label}</span><b>${fmtK(key, k[key])}</b><small class="muted">goal ${fmtK(key, g[key])}</small></div>`;
    };
    return `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Your scorecard today · ${c.done}/${c.stops} stops</span>
      <div class="kpis" style="grid-template-columns:repeat(2,1fr)">${COLS.map(([key, l]) => item(key, l)).join('')}</div></div></div>`;
  },
}];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  period(app, el) { period = el.dataset.p === 'week' ? 'week' : 'today'; app.refresh() },
};
