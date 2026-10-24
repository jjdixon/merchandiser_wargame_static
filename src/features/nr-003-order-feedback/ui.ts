// The MSL's inbox of order feedback (Supervisor), with this week's tally per store.
import { fmt, storeById } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { today, weekTally } from './engine';

export const panels: Panel[] = [
  {
    slot: 'super.aside',
    order: 30,
    render({ state, scope }) {
      const items = today(state).filter(f => f.call !== 'About right')
        .filter(f => { const s = storeById(state, f.storeId); return !!s && scope.store(s) })
        .sort((a, b) => b.at - a.at);
      const list = items.map(f => {
        const s = storeById(state, f.storeId)!, t = weekTally(state, f.storeId)[f.unit];
        const streak = f.call === 'Light' ? t.light : t.heavy;
        return `<div class="st" style="grid-template-columns:auto 1fr"><span class="flag ${f.call === 'Light' ? 'late' : 'wait'}">${esc(f.call)}</span>
          <div><b>${esc(s.name)} · ${esc(f.unit)}</b>${f.call !== f.suggested ? ` <span class="muted" style="font-size:12px">app said ${esc(f.suggested.toLowerCase())}</span>` : ''}
          <div class="muted" style="font-size:12.5px">${esc(f.by)}${f.auto ? ' (simulated)' : ''} · ${fmt(f.at)} · MSL ${esc(f.market)}${streak > 1 ? ` · ${streak}× ${esc(f.call.toLowerCase())} this week` : ''}</div>
          <div class="muted" style="font-size:12px">${esc(f.why)}</div></div></div>`;
      }).join('');
      const n = today(state).filter(f => { const s = storeById(state, f.storeId); return !!s && scope.store(s) }).length;
      return `<section class="panel"><div class="ph"><h2>Order feedback for MSLs</h2><span class="muted" style="font-size:12.5px">NR-003 · ${n} answered today</span></div>
        <div class="pb">${list ? `<div class="route">${list}</div>` : '<p class="muted" style="margin:0">Nothing light or heavy yet today.</p>'}</div></section>`;
    },
  },
];
