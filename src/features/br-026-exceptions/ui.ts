// Exceptions tab: counts by type and day, then drill down to the stop.
import { DAYS, fmt, merchById, storeById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, ViewCtx, ViewDef } from '../../app/feature';
import { EX_TYPES, ID, OTHER, grid, week, type Exception } from './engine';

const f: { type?: string; merchId?: string; storeId?: string; day?: number } = {};
const label = (id: string) => (EX_TYPES.find(t => t.id === id) ?? OTHER).label;
const SEV = { bad: 'late', warn: 'wait', info: '' } as const;

function item(ctx: ViewCtx, e: Exception): string {
  const s = e.storeId ? storeById(ctx.state, e.storeId) : null, m = e.merchId ? merchById(ctx.state, e.merchId) : null;
  return `<div class="al" style="grid-template-columns:auto 1fr"><span class="mono">${esc(DAYS[e.day])} ${fmt(e.t)}</span>
    <span><span class="flag ${SEV[e.sev]}">${esc(label(e.type))}</span> ${esc(e.text)}
      <span class="muted" style="display:block;font-size:12px">${m ? `<a href="#" data-act="${ID}:by" data-m="${esc(m.id)}">${esc(m.name)}</a>` : ''}${m && s ? ' · ' : ''}${s ? ctx.storeLink(s) : ''}</span></span></div>`;
}

export const exceptionsView: ViewDef = {
  id: 'exceptions',
  label: 'Exceptions',
  render(ctx: ViewCtx) {
    const { state, scope } = ctx;
    const visible = (e: Exception) => {
      const s = e.storeId ? storeById(state, e.storeId) : null, m = e.merchId ? merchById(state, e.merchId) : null;
      return (!s || scope.store(s)) && (!m || scope.merch(m)) && (s || m || !scope.label);
    };
    const all = week(state, { merchId: f.merchId, storeId: f.storeId }).filter(visible);
    const g = grid(all);
    const list = all.filter(e => (!f.type || e.type === f.type) && (f.day == null || e.day === f.day)).sort((a, b) => b.day - a.day || b.t - a.t);
    const people = state.merch.filter(scope.merch), stores = state.stores.filter(scope.store);
    const sel = (name: string, items: Array<[string, string]>, cur?: string) => `<select data-fchange="${ID}:${name}"><option value="">${name === 'merch' ? 'Everyone' : 'All stores'}</option>${items.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const cellBtn = (type: string, d: number | null, n: number) => n ? `<button class="btn sm${f.type === type && f.day === (d ?? undefined) ? ' pri' : ''}" data-act="${ID}:pick" data-type="${esc(type)}"${d != null ? ` data-day="${d}"` : ''}>${n}</button>` : '<span class="muted">·</span>';
    return `<section class="panel"><div class="ph"><h2>Exceptions this week</h2>
        <div class="ctl" style="gap:6px">${sel('merch', people.map(m => [m.id, m.name]), f.merchId)}${sel('store', stores.map(s => [s.id, s.name]), f.storeId)}${f.type || f.day != null || f.merchId || f.storeId ? `<button class="btn sm" data-act="${ID}:clear">Clear</button>` : ''}</div></div>
      <div class="tw"><table><thead><tr><th>Type</th>${DAYS.map((d, i) => `<th class="n">${d}${i === state.day ? ' ·' : ''}</th>`).join('')}<th class="n">Week</th></tr></thead>
        <tbody>${g.map(r => `<tr><td>${esc(r.type.label)}</td>${r.byDay.map((n, d) => `<td class="n">${cellBtn(r.type.id, d, n)}</td>`).join('')}<td class="n">${cellBtn(r.type.id, null, r.total)}</td></tr>`).join('') || `<tr><td colspan="9" class="muted">No exceptions yet — run the day.</td></tr>`}</tbody></table></div>
      <div class="pb note">Warnings and problems from every screen, typed by what they say. Unfinished stops are added when a day ends. Click a number to see those exceptions.</div></section>
    <section class="panel"><div class="ph"><h2>${f.type ? esc(label(f.type)) : 'All exceptions'}${f.day != null ? ` · ${esc(DAYS[f.day])}` : ''}</h2><span class="muted" style="font-size:12.5px">${list.length}</span></div>
      <div class="alerts" style="max-height:none">${list.slice(0, 200).map(e => item(ctx, e)).join('') || '<div class="empty"><strong>Nothing here</strong>No exceptions match.</div>'}</div></section>`;
  },
};

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  pick(app, el) { f.type = el.dataset.type; f.day = el.dataset.day != null ? Number(el.dataset.day) : undefined; app.refresh() },
  by(app, el) { f.merchId = el.dataset.m; app.refresh() },
  clear(app) { delete f.type; delete f.day; delete f.merchId; delete f.storeId; app.refresh() },
};
export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  merch(app, el) { f.merchId = el.value || undefined; app.refresh() },
  store(app, el) { f.storeId = el.value || undefined; app.refresh() },
};
