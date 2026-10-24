// Scheduler panel: each store's complexity class (editable) and what it does to labor.
import { fmt, setRule, storeById, workMin } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { CLASSES, ID, casesPerHour, classKey, storeClass } from './engine';

export const panels: Panel[] = [{
  slot: 'sched.after',
  order: 10,
  render({ state, scope }) {
    const rows = state.stores.filter(scope.store).map(s => {
      const cls = storeClass(state, s), started = !!s.lock;
      const opts = CLASSES.map((c, i) => `<option value="${i}"${i === cls ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
      return `<tr><td class="sname">${esc(s.name)}<small>${esc(s.routeType)}${s.lock ? ' · started ' + fmt(s.lock.depart) : ''}</small></td>
        <td><select data-fchange="${ID}:setClass" data-id="${esc(s.id)}" aria-label="Complexity for ${esc(s.name)}">${opts}</select></td>
        <td class="n">${s.cases}</td><td class="n">${Math.round(workMin(state, s))}${started ? '<span class="muted"> (fixed)</span>' : ''}</td>
        <td class="n">${casesPerHour(state, s).toFixed(0)}</td></tr>`;
    }).join('');
    return `<section class="panel"><div class="ph"><h2>Work standards by store</h2><span class="muted" style="font-size:12.5px">BR-024 · change a class and watch the timeline</span></div>
      <div class="tw"><table><thead><tr><th>Store</th><th>Complexity</th><th class="n">Cases</th><th class="n">Std minutes</th><th class="n">Cases / hr</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="pb note">${CLASSES.map(c => `<b>${esc(c.label)}</b>: ${esc(c.note)}.`).join(' ')} Class percentages are on Pay &amp; labor rules. A store already started keeps the time it was planned with.</div></section>`;
  },
}];

export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  setClass(app, el) {
    const s = storeById(app.state, el.dataset.id!);
    if (!s) return;
    setRule(app.state.rules, classKey(s.id), Number(el.value));
    el.blur();
    app.toast(`${s.name}: ${CLASSES[Number(el.value)].label}`);
    app.refresh();
  },
};
