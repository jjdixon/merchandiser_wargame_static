// Store page (a tab that store links open) and store notes on the phone.
import { DAYS, fmt, merchById, plan, storeById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel, ViewCtx, ViewDef } from '../../app/feature';
import { CATEGORIES, ID, addNote, banner, historyFor, notesFor, openTasks, profileOf, resolveNote, storeCompliance, type Note, type Visibility } from './engine';

const ACTION = { setup: 'Build', check: 'Check', remove: 'Remove' } as const;
const dayLabel = (d: number) => (d >= 0 && d <= 6 ? DAYS[d] : d < 0 ? `${-d}d before Mon` : 'next week');
let search = '';
let picked: string | null = null;

const leader = (ctx: { scope: { lockMerch: string | null } }) => !ctx.scope.lockMerch;

function noteHtml(n: Note, ctx: ViewCtx, showStore = false): string {
  const s = showStore ? storeById(ctx.state, n.storeId) : null;
  return `<div class="al" style="grid-template-columns:auto 1fr"><span class="flag${n.followUp && !n.done ? ' wait' : ''}">${esc(n.category)}</span>
    <span>${s ? `<b>${ctx.storeLink(s)}</b> · ` : ''}${esc(n.text)}
      <span class="muted" style="font-size:12px;display:block">${esc(n.author)} · ${esc(dayLabel(n.day))}${n.t != null ? ' ' + fmt(n.t) : ''}${n.visibility === 'leaders' ? ' · leaders only' : ''}${n.followUp ? (n.done ? ' · follow-up done' : ' · <b>follow-up</b>') : ''}
      ${n.followUp && !n.done ? ` <button class="btn sm" data-act="${ID}:resolve" data-note="${n.id}">Mark done</button>` : ''}</span></span></div>`;
}

export const storeView: ViewDef = {
  id: 'store',
  label: 'Stores',
  public: true,
  opensStore: true,
  render(ctx: ViewCtx) {
    const { state, scope } = ctx, stores = state.stores.filter(scope.store);
    if (!stores.length) return '<section class="panel"><div class="pb muted">No stores to show.</div></section>';
    const id = [ctx.selStore, picked].find(x => x && stores.some(s => s.id === x)) ?? stores[0].id;
    picked = id;
    const s = storeById(state, id)!, p = profileOf(s.id), m = merchById(state, s.assign ?? '');
    const pick = `<select data-fchange="${ID}:pick" aria-label="Store">${stores.map(x => `<option value="${esc(x.id)}"${x.id === s.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
    const tasks = openTasks(state, s), hist = historyFor(state, s.id).slice(0, 8), comp = storeCompliance(state, s.id);
    const stopPlan = m ? plan(state, m).stops.find(x => x.s.id === s.id) : undefined;
    const kv = (k: string, v: string) => `<div><span class="lbl">${k}</span><div>${v}</div></div>`;
    const list = notesFor(state, { storeId: s.id, leader: leader(ctx), q: search });
    const all = search ? notesFor(state, { leader: leader(ctx), q: search }).filter(n => stores.some(x => x.id === n.storeId) && n.storeId !== s.id) : [];
    return `<section class="panel"><div class="ph"><h2>${esc(s.name)}</h2>${pick}</div>
      <div class="pb" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
        ${kv('Banner · store #', `${esc(banner(s))} · ${esc(p?.storeNumber ?? '—')}`)}
        ${kv('Address', esc(p?.address ?? '—'))}
        ${kv('Market · route type', `${esc(s.market || '—')} · ${esc(s.routeType)}${s.pullUp ? ' (pull-up today)' : ''}`)}
        ${kv('Covered by today', m ? `${esc(m.name)}${stopPlan ? ` · ${fmt(stopPlan.start)}–${fmt(stopPlan.end)}` : ''}` : '<span class="muted">nobody</span>')}
        ${kv('Brands', esc(p?.brands.join(', ') ?? '—'))}
        ${kv('Today', `${s.trays} trays · ${s.cases} cases · truck ${fmt(s.eta)}`)}
        ${kv('Contacts', p ? p.contacts.map(c => `${esc(c.role)}: ${esc(c.name)}`).join('<br>') : '—')}
        ${kv('Constraints', p ? p.constraints.map(esc).join('<br>') : '—')}
        ${kv('Display compliance', comp.rate == null ? '<span class="muted">nothing rated yet</span>' : `${Math.round(comp.rate * 100)}% of ${comp.rated}`)}
        ${s.backstock ? kv('Backstock today', `arrival ${s.backstock.start ? `${s.backstock.start.trays} · ${s.backstock.start.cases}` : '—'} · leaving ${s.backstock.end ? `${s.backstock.end.trays} · ${s.backstock.end.cases}` : '—'}`) : ''}
      </div></section>
    <section class="grid two">
      <div class="grid">
        <div class="panel"><div class="ph"><h2>Open tasks</h2><span class="muted" style="font-size:12.5px">displays due today</span></div>
          <div class="pb">${tasks.length ? `<div class="route">${tasks.map(x => `<div class="st"><span></span><div><b>${ACTION[x.action]}: ${esc(x.task.name)}</b><div class="muted" style="font-size:12.5px">${esc(x.task.fixture)} · ${esc(x.task.location)}${x.late ? ` · <b>${x.late} day${x.late > 1 ? 's' : ''} late</b>` : ''}</div></div><span></span></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nothing due today.</p>'}</div></div>
        <div class="panel"><div class="ph"><h2>Recent display history</h2><span class="muted" style="font-size:12.5px">this week</span></div>
          <div class="alerts">${hist.map(e => `<div class="al"><span class="mono">${esc(DAYS[e.day] ?? '')} ${fmt(e.t)}</span><span>${esc(state.displays.tasks.find(t => t.id === e.taskId)?.name ?? e.taskId)} · ${esc(e.action)} · ${esc(e.result)}${e.reason ? ` (${esc(e.reason)})` : ''} · ${esc(e.by)}</span></div>`).join('') || '<div class="empty"><strong>Nothing yet</strong>Display results show here as visits happen.</div>'}</div></div>
      </div>
      <div class="panel"><div class="ph"><h2>Notes</h2><input type="text" placeholder="Search all notes" value="${esc(search)}" data-fchange="${ID}:search" aria-label="Search notes" style="width:12em"></div>
        <div class="pb fg" style="gap:6px">
          <div class="ctl" style="gap:6px"><select id="noteCat" aria-label="Category">${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
            ${leader(ctx) ? '<select id="noteVis" aria-label="Who can see it"><option value="everyone">Everyone</option><option value="leaders">Leaders only</option></select>' : ''}
            <label class="muted" style="font-size:13px"><input type="checkbox" id="noteFollow"> Needs follow-up</label></div>
          <div class="ctl" style="gap:6px"><input type="text" id="noteText" placeholder="Add a note for whoever works this store next" style="flex:1;min-width:0"><button class="btn sm pri" data-act="${ID}:add" data-store="${esc(s.id)}">Add</button></div>
        </div>
        <div class="alerts">${list.map(n => noteHtml(n, ctx)).join('') || `<div class="empty"><strong>No notes${search ? ' match' : ''}</strong>Notes stay with the store across days and people.</div>`}</div>
        ${all.length ? `<div class="pb"><span class="lbl">Other stores matching “${esc(search)}”</span></div><div class="alerts">${all.map(n => noteHtml(n, ctx, true)).join('')}</div>` : ''}
      </div>
    </section>`;
  },
};

export const panels: Panel[] = [{
  slot: 'merch.after',
  order: 3,
  render(ctx) {
    const m = merchById(ctx.state, ctx.selM);
    if (!m) return '';
    const items = plan(ctx.state, m).stops.flatMap(x => notesFor(ctx.state, { storeId: x.s.id, leader: false }).filter(n => n.followUp && !n.done || n.day >= ctx.state.day - 1).slice(0, 2));
    if (!items.length) return '';
    return `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Store notes on your route</span><div class="alerts">${items.map(n => noteHtml(n, ctx, true)).join('')}</div></div></div>`;
  },
}];

const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null);
export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  add(app, el) {
    const text = val('noteText')?.value ?? '';
    const m = merchById(app.state, app.selM);
    const author = app.viewer?.toLowerCase().includes('merchandiser') && m ? m.name : app.viewer?.split(' · ').slice(0, 2).join(' ') || 'Facilitator';
    const n = addNote(app.state, {
      storeId: el.dataset.store!, text, author, category: val('noteCat')?.value ?? 'Other',
      visibility: ((val('noteVis')?.value as Visibility) || 'everyone'), followUp: !!val('noteFollow')?.checked,
    });
    app.toast(n ? 'Note saved to the store' : 'Type a note first');
    app.refresh();
  },
  resolve(app, el) { resolveNote(app.state, Number(el.dataset.note)); app.refresh() },
};
export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  pick(app, el) { picked = el.value; app.openStore(el.value) },
  search(app, el) { search = el.value; app.refresh() },
};
