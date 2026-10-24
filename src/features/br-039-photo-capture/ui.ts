// Supervisor panel: today's photos with metadata and the recognition suggestion
// to confirm or correct. (The full central photo review queue is BR-043, M5.)
import { fmt, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, photos, review } from './engine';

const TONE = { compliant: 'ok', 'partially compliant': 'wait', 'non-compliant': 'late' } as const;

export const panels: Panel[] = [{
  slot: 'super.aside',
  order: 30,
  render({ state, scope }) {
    const list = photos(state).map((p, i) => ({ p, i })).filter(({ p }) => { const s = state.stores.find(x => x.id === p.storeId); return !s || scope.store(s) });
    if (!list.length) return '';
    const real = list.filter(x => !x.p.simulated).length;
    return `<div class="panel"><div class="ph"><h2>Photos</h2><span class="muted" style="font-size:12.5px">BR-039 · ${list.length} today${real ? ` · ${real} taken on a phone` : ''}</span></div>
      <div class="alerts">${list.slice().reverse().map(({ p, i }) => {
        const sg = p.suggestion;
        const thumb = p.url ? `<img src="${esc(p.url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px">` : `<div style="width:56px;height:56px;border-radius:6px;background:var(--soft);display:grid;place-items:center;font-size:11px" class="muted">sim</div>`;
        const reviewed = p.review ? `<span class="flag ${p.review === 'confirmed' ? 'ok' : 'wait'}">${p.review}</span>`
          : `<button class="btn sm" data-act="${ID}:confirm" data-i="${i}">Looks right</button><button class="btn sm" data-act="${ID}:correct" data-i="${i}">Wrong</button>`;
        return `<div style="display:grid;grid-template-columns:56px 1fr;gap:10px;padding:8px 14px;border-bottom:1px solid var(--soft);font-size:13px">${thumb}
          <div style="min-width:0"><b>${esc(p.stepTitle)}</b><div class="muted">${esc(p.storeName)} · ${esc(merchById(state, p.merchId ?? '')?.name ?? '')} · ${fmt(p.at)} · at store (${p.location.join(', ')})</div>
          <div>Suggested: ${esc(sg.productGroup)} · ${esc(sg.displayType)} · <span class="flag ${TONE[sg.compliance]}">${sg.compliance}</span> <span class="muted mono">${sg.confidence}%</span></div>
          <div class="ctl" style="margin-top:4px">${reviewed}</div></div></div>`;
      }).join('')}</div>
      <div class="pb note">Recognition is simulated to test the review workflow; real accuracy needs proof first.</div></div>`;
  },
}];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  confirm(app, el) { review(app.state, Number(el.dataset.i), 'confirmed'); app.refresh() },
  correct(app, el) { review(app.state, Number(el.dataset.i), 'corrected'); app.toast('Marked as wrong — feeds recognition accuracy'); app.refresh() },
};
