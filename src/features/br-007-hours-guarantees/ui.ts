// Week view: guarantee / max / worked / planned rest of week per person.
// Supervisor: unfinished-at-max list with a reason picker.
import { DAYS, allPlans, fmt, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, REASONS, explain, hoursNow, hoursState, limitsFor } from './engine';

export const panels: Panel[] = [
  {
    slot: 'week.after',
    order: 10,
    render(ctx) {
      const { state, scope } = ctx;
      // Planned for the rest of the week: today's plan plus each future day's projection.
      const future: Record<string, number> = {};
      for (let d = state.day + 1; d < 7; d++) for (const p of allPlans(ctx.projectDay(d))) future[p.m.id] = (future[p.m.id] ?? 0) + p.paid / 60;
      const rows = state.merch.filter(scope.merch).map(m => {
        const h = hoursNow(state, m), lim = limitsFor(m), total = h.endOfToday + (future[m.id] ?? 0);
        const flag = total > lim.max ? `<span class="flag late">${(total - lim.max).toFixed(1)} h over max</span>`
          : total < lim.guarantee ? `<span class="flag wait">${(lim.guarantee - total).toFixed(1)} h short of guarantee — offer productive work</span>`
          : '<span class="flag ok">within range</span>';
        return `<tr><td class="sname">${esc(m.name)}<small>${esc(m.role)}</small></td><td class="n">${lim.guarantee}</td><td class="n">${lim.max}</td>
          <td class="n">${h.worked.toFixed(1)}</td><td class="n">${total.toFixed(1)}</td><td class="n">${Math.max(0, lim.max - h.worked).toFixed(1)}</td><td>${flag}</td></tr>`;
      }).join('');
      return `<section class="panel"><div class="ph"><h2>Hours this week</h2><span class="muted" style="font-size:12.5px">BR-007 · guaranteed minimum and maximum per person</span></div>
        <div class="tw"><table><thead><tr><th>Person</th><th class="n">Guarantee</th><th class="n">Max</th><th class="n">Worked so far</th><th class="n">Planned week</th><th class="n">Left to max</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="pb note">Daily hours can vary as long as the week lands between the guarantee and the maximum. Limits are in limits.json, placeholders pending union and legal review.</div></section>`;
    },
  },
  {
    slot: 'super.main',
    order: 25,
    render({ state, scope }) {
      const list = hoursState(state).unfinished.map((u, i) => ({ u, i })).filter(({ u }) => scope.merch(merchById(state, u.merchId)!));
      if (!list.length) return '';
      return `<div class="panel" style="border-color:var(--late)"><div class="ph"><h2>Unfinished at max hours</h2><span class="muted" style="font-size:12.5px">BR-007 · say why</span></div>
        ${list.map(({ u, i }) => `<div style="padding:8px 14px;border-bottom:1px solid var(--soft);font-size:13px;display:flex;flex-direction:column;gap:4px">
          <div><b>${esc(merchById(state, u.merchId)!.name)}</b> · ${DAYS[u.day]} ${fmt(u.at)} · released: ${esc(u.stores.join(', '))}</div>
          <select data-fchange="${ID}:reason" data-i="${i}" aria-label="Why unfinished"><option value="">Why was it unfinished?</option>${REASONS.map(r => `<option${u.reason === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></div>`).join('')}</div>`;
    },
  },
];

export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  reason(app, el) { if (el.value) { explain(app.state, Number(el.dataset.i), el.value); el.blur(); app.refresh() } },
};
