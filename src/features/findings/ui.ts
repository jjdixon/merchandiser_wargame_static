// Findings: the "This won't work because…" button, its form, and the Findings tab.
import { fmt, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, ViewDef } from '../../app/feature';
import { findingsAsMarkdown, findingsAsText, loadFindings, saveFindings, type Finding } from './storage';
import AREAS from './areas.json';

let list: Finding[] = loadFindings();
let confirmClear = false;

const contextLine = (app: AppApi) => {
  const m = merchById(app.state, app.selM);
  return `${app.viewName}${app.viewName === 'Merchandiser' && m ? ' · ' + m.name : ''} · ${fmt(app.state.t)} · ${app.scenarioLabel}`;
};

export const findingsView: ViewDef = {
  id: 'findings',
  label: 'Findings',
  badge: () => (list.length ? `(${list.length})` : ''),
  render() {
    if (!list.length) return `<section class="panel"><div class="empty"><strong>No findings yet</strong>Every time someone says “that's not how it works,” tap <b>This won't work because…</b> at the bottom right. The screen, merchandiser and clock time get attached automatically.</div></section>`;
    const byArea: Record<string, number> = {};
    list.forEach(f => (byArea[f.area] = (byArea[f.area] ?? 0) + 1));
    const actions = confirmClear
      ? '<span class="flag late">Delete all findings on this device?</span><button class="btn sm" data-act="findings:clearNo">Keep</button><button class="btn sm pri" data-act="findings:clearYes">Delete all</button>'
      : '<button class="btn sm" data-act="findings:copy">Copy as text</button><button class="btn sm" data-act="findings:copyMd">Copy for backlog.md</button><button class="btn sm" data-act="findings:clear">Clear…</button>';
    return `<section class="panel"><div class="ph"><h2>${list.length} finding${list.length > 1 ? 's' : ''}</h2><div class="ctl">${actions}</div></div>
      <div class="pb legend">${Object.entries(byArea).map(([k, v]) => `<span>${esc(k)} <b class="mono">${v}</b></span>`).join('')}</div>
      <div class="fl">${list.slice().reverse().map(f => `<div class="f"><div class="meta"><span class="pill">${esc(f.area)}</span><span class="mono">${esc(f.context)}</span></div><p>${esc(f.text)}</p><div><button class="btn sm" data-act="findings:remove" data-id="${esc(f.id)}">Remove</button></div></div>`).join('')}</div>
      <div class="pb note">Saved in this browser only. After each session, use “Copy for backlog.md” and paste into docs/backlog.md in the repo.</div></section>`;
  },
};

export const findingsActions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  copy: app => void app.copy(findingsAsText(list), `Copied ${list.length} findings`),
  copyMd: app => void app.copy(findingsAsMarkdown(list), 'Copied as Markdown checklist'),
  clear: app => { confirmClear = true; app.refresh() },
  clearNo: app => { confirmClear = false; app.refresh() },
  clearYes: app => { list = []; saveFindings(list); confirmClear = false; app.refresh() },
  remove: (app, el) => { list = list.filter(f => f.id !== el.dataset.id); saveFindings(list); app.refresh() },
};

/** Adds the floating button and its form to the page. */
export function mountFindings(app: AppApi): void {
  const host = document.createElement('div');
  host.innerHTML = `
    <button class="fab" id="fab">This won't work because…</button>
    <div class="scrim" id="scrim" hidden>
      <form class="sheet" id="fbForm">
        <h2 style="font-size:18px">This won't work because…</h2>
        <div class="ctx" id="fbCtx"></div>
        <label class="lbl" for="fbCat">Area</label>
        <select id="fbCat">${(AREAS as string[]).map(a => `<option>${esc(a)}</option>`).join('')}</select>
        <label class="lbl" for="fbTxt">What breaks, and what really happens in the field?</label>
        <textarea id="fbTxt" placeholder="e.g. Receiving doesn't open until 7 — trucks get there at 5:30 but we can't touch product until they check it in."></textarea>
        <div class="ctl" style="justify-content:flex-end">
          <button type="button" class="btn" id="fbCancel">Cancel</button>
          <button type="submit" class="btn pri">Log finding</button>
        </div>
      </form>
    </div>`;
  document.body.append(...host.children);
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const scrim = $<HTMLDivElement>('scrim'), txt = $<HTMLTextAreaElement>('fbTxt');
  const close = () => { scrim.hidden = true; txt.value = '' };
  $('fab').addEventListener('click', () => {
    $('fbCtx').textContent = contextLine(app);
    scrim.hidden = false;
    setTimeout(() => txt.focus(), 30);
  });
  $('fbCancel').addEventListener('click', close);
  scrim.addEventListener('click', e => { if (e.target === scrim) close() });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !scrim.hidden) close() });
  $('fbForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = txt.value.trim();
    if (!text) { txt.focus(); return }
    list.push({ id: 'f' + Date.now(), area: $<HTMLSelectElement>('fbCat').value, context: contextLine(app), text, at: new Date().toISOString() });
    saveFindings(list);
    close();
    app.toast('Finding logged');
    app.refresh();
  });
}
