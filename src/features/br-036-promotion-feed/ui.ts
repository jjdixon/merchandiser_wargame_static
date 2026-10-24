// Promotions tab: what's loaded, how many store tasks each made, the version log,
// and a box to paste a spreadsheet.
import { DAYS, fmt } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, ViewCtx, ViewDef } from '../../app/feature';
import { COLUMNS, ID, TEMPLATE, feed, loadPasted, parseSheet, promotions } from './engine';

const dayName = (d: number) => (d >= 0 && d <= 6 ? DAYS[d] : d < 0 ? `${-d}d before Mon` : `${d - 6}d after Sun`);
let lastResult = '';

export const promotionsView: ViewDef = {
  id: 'promos',
  label: 'Promotions',
  render(ctx: ViewCtx) {
    const { state, scope } = ctx;
    const visible = new Set(state.stores.filter(scope.store).map(s => s.id));
    const rows = promotions(state).map(p => {
      const tasks = state.displays.tasks.filter(t => t.promoId === p.id);
      const where = [p.stores?.length ? `stores ${p.stores.join(', ')}` : '', p.banners?.length ? p.banners.join(', ') : '', p.markets?.length ? `${p.markets.join(', ')} market` : '', p.routeTypes?.length ? p.routeTypes.join(', ') : ''].filter(Boolean).join(' · ') || 'all stores';
      const live = state.day >= p.start && state.day <= p.end;
      return `<tr><td class="mono">${esc(p.id)}<small>v${p.version}</small></td>
        <td>${esc(p.name)}<div class="muted" style="font-size:12px">${esc(p.brand)} · ${esc(p.productGroup)} · ${esc(p.displayType)}</div></td>
        <td>${esc(where)}</td>
        <td>${esc(dayName(p.start))} → ${esc(dayName(p.end))}${live ? ' <span class="flag ok">live</span>' : state.day > p.end ? ' <span class="muted">ended</span>' : ''}</td>
        <td class="n">${tasks.length}<small>${tasks.filter(t => visible.has(t.storeId)).length} visited today</small></td></tr>`;
    }).join('');
    const log = feed(state).log.slice().reverse().map(l => `<div class="al"><span class="mono">${esc(DAYS[l.day])} ${fmt(l.at)}</span><span><b>${esc(l.id)} v${l.version}</b> — ${esc(l.changed.join(', '))}</span></div>`).join('');
    return `<section class="panel"><div class="ph"><h2>Promotions and display standards</h2><span class="muted" style="font-size:12.5px">BR-036 · each one makes a display task per matching store</span></div>
        <div class="tw"><table><thead><tr><th>Id</th><th>Promotion</th><th>Stores</th><th>Runs</th><th class="n">Store tasks</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      <section class="grid two">
        <div class="panel"><div class="ph"><h2>Paste a spreadsheet</h2><button class="btn sm" data-act="${ID}:template">Copy template</button></div>
          <div class="pb fg" style="gap:8px">
            <p class="note" style="margin:0">Copy rows from Excel (with the header row) and paste. Columns: <span class="mono" style="font-size:12px">${COLUMNS.join(', ')}</span>. Lists use “;”. Days are Mon…Sun. Same id again = a new version.</p>
            <textarea id="promoPaste" rows="6" style="width:100%;font-family:var(--mono);font-size:12px" placeholder="id&#9;name&#9;start&#9;end …"></textarea>
            <div class="ctl"><button class="btn pri" data-act="${ID}:load">Load</button>${lastResult ? `<span class="muted" style="font-size:13px">${esc(lastResult)}</span>` : ''}</div>
          </div></div>
        <div class="panel"><div class="ph"><h2>Version log</h2><span class="muted" style="font-size:12.5px">this week</span></div>
          <div class="alerts">${log || '<div class="empty"><strong>No changes yet</strong>Seed promotions are version 1.</div>'}</div></div>
      </section>`;
  },
};

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  load(app) {
    const box = document.getElementById('promoPaste') as HTMLTextAreaElement | null;
    const { promotions: list, errors } = parseSheet(box?.value ?? '');
    if (!list.length) { lastResult = errors.join('; ') || 'No rows found'; app.refresh(); return }
    const r = loadPasted(app.state, list);
    lastResult = `${r.added} added, ${r.updated} new version${r.updated === 1 ? '' : 's'}, ${r.unchanged} unchanged${errors.length ? ` · skipped: ${errors.join('; ')}` : ''}`;
    app.toast('Promotions loaded — store tasks updated');
    app.refresh();
  },
  template(app) { void app.copy(TEMPLATE, 'Template copied — paste it into Excel') },
};
