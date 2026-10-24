import { merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, award, bidState, eligible, hired, openBid, placeBid, publishAward, runs, simulateBids } from './engine';

const nm = (state: Parameters<typeof runs>[0], id: string) => merchById(state, id)?.name ?? id;

export const panels: Panel[] = [
  {
    slot: 'week.after',
    order: 5,
    render({ state, scope }) {
      const b = bidState(state);
      const openable = runs(state).filter(r => !b.bids.some(x => x.run.owner === r.owner && x.status !== 'published'));
      const bids = b.bids.map(bid => {
        const el = eligible(state, bid.run);
        const body = bid.status === 'open'
          ? `<div class="ctl" style="gap:10px;flex-wrap:wrap">${el.map(m => `<label class="ctl" style="gap:4px;font-size:13px"><input type="checkbox" data-fchange="${ID}:bid" data-b="${bid.id}" data-m="${esc(m.id)}"${bid.bidders.includes(m.id) ? ' checked' : ''}>${esc(m.name)} <span class="muted">(${hired(m.id).slice(0, 4)})</span></label>`).join('') || '<span class="muted">Nobody eligible.</span>'}</div>
             <div class="ctl" style="gap:6px"><button class="btn sm" data-act="${ID}:simulate" data-b="${bid.id}">Simulate bids</button><button class="btn sm pri" data-act="${ID}:award" data-b="${bid.id}"${bid.bidders.length ? '' : ' disabled'}>Close & award</button></div>`
          : `<div style="font-size:13px"><b>${esc(nm(state, bid.awardee!))}</b> — ${esc(bid.why ?? '')} · bidders: ${esc(bid.bidders.map(x => nm(state, x)).join(', '))}</div>
             ${bid.status === 'awarded' ? `<button class="btn sm pri" data-act="${ID}:publish" data-b="${bid.id}">Publish (owner from tomorrow)</button>` : '<span class="flag ok">published</span>'}`;
        return `<div style="padding:8px 14px;border-bottom:1px solid var(--soft);display:flex;flex-direction:column;gap:6px">
          <div><b>${esc(nm(state, bid.run.owner))}'s run</b> <span class="muted">· ${bid.run.storeIds.length} stores · ${esc(bid.run.market)} · ${esc(bid.run.routeTypes.join('/'))}</span> <span class="flag ${bid.status === 'open' ? 'wait' : 'ok'}">${bid.status}</span></div>${body}</div>`;
      }).join('');
      return `<section class="panel"><div class="ph"><h2>Route bidding</h2><span class="muted" style="font-size:12.5px">BR-003 · eligible = qualified for every route type on the run</span></div>
        <div class="pb ctl" style="gap:6px"><span class="muted">Open a bid on</span><select id="bid-run" aria-label="Run">${openable.filter(r => scope.merch(merchById(state, r.owner)!)).map(r => `<option value="${esc(r.owner)}">${esc(nm(state, r.owner))}'s run (${r.storeIds.length})</option>`).join('')}</select><button class="btn" data-act="${ID}:open">Open bid</button></div>
        ${bids}</section>`;
    },
  },
  {
    slot: 'merch.after',
    order: 30,
    render({ state, selM }) {
      const open = bidState(state).bids.filter(b => b.status === 'open' && eligible(state, b.run).some(m => m.id === selM));
      if (!open.length) return '';
      return `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Open bids you can bid on</span>
        ${open.map(b => `<label class="ctl" style="gap:8px;font-size:14px"><input type="checkbox" data-fchange="${ID}:bid" data-b="${b.id}" data-m="${esc(selM)}"${b.bidders.includes(selM) ? ' checked' : ''} style="width:20px;height:20px">
          ${esc(nm(state, b.run.owner))}'s run · ${b.run.storeIds.length} stores · ${esc(b.run.market)}</label>`).join('')}</div></div>`;
    },
  },
];

const v = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';
export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  open(app) { if (!openBid(app.state, v('bid-run'))) app.toast('That run already has an open bid'); app.refresh() },
  simulate(app, el) { simulateBids(app.state, Number(el.dataset.b)); app.refresh() },
  award(app, el) { const w = award(app.state, Number(el.dataset.b)); app.toast(w ? `Awarded to ${w.name}` : 'No bids yet'); app.refresh() },
  publish(app, el) { publishAward(app.state, Number(el.dataset.b)); app.refresh() },
};
export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  bid(app, el) { placeBid(app.state, Number(el.dataset.b), el.dataset.m!, el.checked); app.refresh() },
};
