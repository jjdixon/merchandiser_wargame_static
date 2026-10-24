import { DAYS, fmt, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { SECOND, holidayDay, secondVisitsToday } from './engine';

export const panels: Panel[] = [
  {
    slot: 'sched.after',
    order: 3,
    render({ state, scope }) {
      const v = secondVisitsToday(state).filter(scope.store), hol = holidayDay(state);
      if (!v.length && hol < 0) return '';
      return `<section class="panel"><div class="ph"><h2>Second visits${hol >= 0 ? ' & holiday' : ''}</h2><span class="muted" style="font-size:12.5px">BR-008</span></div>
        <div class="pb fg" style="gap:6px;font-size:13px">
        ${hol >= 0 ? `<div><span class="flag wait">Holiday ${DAYS[hol]}</span> no deliveries that day; ${DAYS[hol - 1] ?? '—'} builds up ×1.3; ${DAYS[hol + 1] ?? '—'} catches up ×1.5.</div>` : ''}
        ${v.map(s => { const why = SECOND.find(x => `${x.store}~2nd` === s.id)?.why ?? ''; return `<div><b>${esc(s.name)}</b> · ${fmt(s.eta)}–${fmt(s.win)} · ${s.cases} cases · ${esc(merchById(state, s.assign ?? '')?.name ?? 'unassigned')} <span class="muted">— ${esc(why)}</span></div>` }).join('')}
        </div></section>`;
    },
  },
  {
    slot: 'week.after',
    order: 30,
    render({ state }) {
      const hol = holidayDay(state);
      const rows = SECOND.map(v => `<tr><td>${esc(v.store)}</td><td>${[...v.days].map(l => DAYS['MTWRFSU'.indexOf(l)]).join(', ')}</td><td class="n">${v.at}</td><td>${esc(v.assignTo ?? 'store owner')}</td><td class="muted">${esc(v.why)}</td></tr>`).join('');
      return `<section class="panel"><div class="ph"><h2>Second visits & holiday pattern</h2><span class="muted" style="font-size:12.5px">BR-008 · ${hol >= 0 ? `holiday set for ${DAYS[hol]}` : 'no holiday this week (set one on Pay & labor rules → Holidays)'}</span></div>
        <div class="tw"><table><thead><tr><th>Store</th><th>Days</th><th class="n">At</th><th>Who</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    },
  },
];
