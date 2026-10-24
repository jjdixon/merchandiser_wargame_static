// Supervisor panel: today's out-of-stocks by cause and owner.
import { fmt } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { reports } from './engine';

export const panels: Panel[] = [{
  slot: 'super.aside',
  order: 20,
  render({ state, scope }) {
    const list = reports(state).filter(r => { const s = state.stores.find(x => x.id === r.storeId); return !s || scope.store(s) });
    if (!list.length) return `<div class="panel"><div class="ph"><h2>Out-of-stocks</h2><span class="muted" style="font-size:12.5px">BR-020</span></div><div class="pb muted">None reported yet. They come in at the end of each store visit.</div></div>`;
    const byOwner = new Map<string, number>();
    list.forEach(r => byOwner.set(r.owner, (byOwner.get(r.owner) ?? 0) + 1));
    return `<div class="panel"><div class="ph"><h2>Out-of-stocks</h2><span class="legend">${[...byOwner].map(([o, n]) => `<span>${esc(o)} <b class="mono">${n}</b></span>`).join('')}</span></div>
      <div class="alerts">${list.slice().reverse().map(r => `<div class="al warn"><span class="tm">${fmt(r.at)}</span><span><b>${esc(r.product)}</b> at ${esc(r.storeName)}<br><span class="muted">${esc(r.cause)} → ${esc(r.owner)}${r.auto ? ' · simulated' : ''}</span></span></div>`).join('')}</div></div>`;
  },
}];
