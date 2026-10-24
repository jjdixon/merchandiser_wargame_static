// Scheduler: Draft/Published banner with Publish, and the change log for the week.
import { DAYS, fmt } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, gov, isPublished, publish } from './engine';

export const panels: Panel[] = [{
  slot: 'sched.after',
  order: 1,
  render({ state, scope }) {
    const g = gov(state), pub = g.published[state.day];
    const list = g.changes.filter(c => { const s = state.stores.find(x => x.id === c.storeId); return !s || scope.store(s) }).slice().reverse();
    const banner = pub
      ? `<span class="flag ok">Published ${fmt(pub.at)}</span> <span class="muted">Changes are logged and the people affected are notified.</span>`
      : `<span class="flag wait">Draft</span> <span class="muted">Rework freely. Nothing is logged until you publish.</span> <button class="btn sm pri" data-act="${ID}:publish">Publish ${DAYS[state.day]}</button>`;
    return `<section class="panel"><div class="ph"><h2>${DAYS[state.day]} schedule</h2><span class="ctl" style="font-size:12.5px">${banner}</span></div>
      ${list.length ? `<div class="tw"><table><thead><tr><th>Day</th><th class="n">When</th><th>Store</th><th>Change</th><th>From</th><th>To</th><th></th></tr></thead><tbody>${list.map(c => `<tr>
        <td>${DAYS[c.day]}</td><td class="n">${fmt(c.at)}</td><td class="sname">${esc(c.storeName)}</td><td>${c.kind}</td><td>${esc(c.from)}</td><td>${esc(c.to)}</td>
        <td>${c.usual ? '<span class="flag late">off usual time</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="pb muted" style="font-size:13px">No changes to published schedules yet this week. Merchandisers can\'t change their own schedule; only the Scheduler view can.</div>'}</section>`;
  },
}];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  publish(app) { if (!isPublished(app.state)) { publish(app.state, app.viewer?.split(' · ')[0] ?? 'Scheduler'); app.toast('Published'); app.refresh() } },
};
