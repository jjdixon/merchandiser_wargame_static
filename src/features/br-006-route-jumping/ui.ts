import { fmt, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, risks, sendHelp } from './engine';

export const panels: Panel[] = [{
  slot: 'super.main',
  order: 8,
  render({ state, scope }) {
    const list = risks(state).filter(r => scope.store(r.store));
    if (!list.length) return '';
    return `<div class="panel" style="border-color:var(--work)"><div class="ph"><h2>Send help</h2><span class="muted" style="font-size:12.5px">BR-006 · route jumper first · splits half the remaining work</span></div>
      ${list.map(r => `<div style="padding:8px 14px;border-bottom:1px solid var(--soft);font-size:13px;display:flex;flex-direction:column;gap:6px">
        <div><b>${esc(r.store.name)}</b> ${r.reason === 'late' ? `<span class="flag late">projected ${fmt(r.finish)} · due ${fmt(r.store.win)}</span>` : '<span class="flag late">uncovered</span>'} <span class="muted">${esc(merchById(state, r.store.assign ?? '')?.name ?? '')}</span></div>
        <div class="ctl" style="gap:6px">${r.helpers.map(h => `<button class="btn sm" data-act="${ID}:send" data-store="${esc(r.store.id)}" data-m="${esc(h.merchId)}">${esc(h.name.split(' ')[0])}${h.jumper ? ' (jumper)' : ''} · there by ${fmt(h.arrive)}</button>`).join('')}</div></div>`).join('')}</div>`;
  },
}];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  send(app, el) { if (sendHelp(app.state, el.dataset.store!, el.dataset.m!)) app.toast('Help sent'); app.refresh() },
};
