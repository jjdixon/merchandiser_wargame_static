// Phone screens for the guided visit: the "Next" card, the step-by-step workflow
// inside the current-stop card, and a visit-progress panel for supervisors.
// Step inputs are generic (check / count / choice / entries + photo), so steps
// added by other features render here without this feature knowing about them.
import {
  KM_TO_MI, answerStep, fmt, isAnswered, merchById, plan, readyAt, status, storeById, visitProgress,
  type SimState, type StepAnswer, type Store, type VisitStep,
} from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, canCloseOut, closeOut, setPlaying, visitState } from './engine';

const PHASE_LABEL: Record<VisitStep['phase'], string> = {
  backstock: '1 · Backstock', display: '2 · Displays', aisle: '3 · Aisles', validate: '4 · Validate', oos: '5 · Out-of-stocks',
};

/** Draft rows for 'entries' steps, before the user submits them. */
const drafts = new Map<string, Array<Record<string, string>>>();
const draftKey = (storeId: string, stepId: string) => `${storeId}|${stepId}`;

/** The stop this merchandiser is at (waiting or working), if any. */
function currentVisit(state: SimState, merchId: string) {
  const m = merchById(state, merchId);
  if (!m) return null;
  const p = plan(state, m), st = status(state, p);
  if ((st.k === 'wait' || st.k === 'work') && st.stop) return { m, p, st, s: st.stop.s };
  return { m, p, st, s: null as Store | null };
}

function photoControl(s: Store, step: VisitStep, a: StepAnswer | undefined, disabled: boolean): string {
  if (!step.photo) return '';
  const label = a?.photo ? (a.photo.simulated ? 'Simulated photo' : `📷 ${esc(a.photo.name)}`) : step.photo === 'required' ? 'Photo required' : 'Add photo (optional)';
  const thumb = a?.photo?.url ? `<img src="${esc(a.photo.url)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px">` : '';
  return `<label class="btn sm" style="gap:8px${disabled ? ';opacity:.5' : ''}">${thumb}<span>${label}</span>
    <input type="file" accept="image/*" capture="environment" hidden data-fchange="${ID}:photo" data-store="${esc(s.id)}" data-step="${esc(step.id)}"${disabled ? ' disabled' : ''}></label>`;
}

function stepInput(s: Store, step: VisitStep, a: StepAnswer | undefined, disabled: boolean): string {
  const data = `data-store="${esc(s.id)}" data-step="${esc(step.id)}"${disabled ? ' disabled' : ''}`;
  switch (step.kind) {
    case 'check':
      return `<input type="checkbox" data-fchange="${ID}:check" ${data}${a?.done ? ' checked' : ''} aria-label="${esc(step.title)}" style="width:22px;height:22px;accent-color:var(--work)">`;
    case 'count':
      return `<input type="number" min="0" inputmode="numeric" placeholder="0" data-fchange="${ID}:count" ${data} value="${a?.count ?? ''}" aria-label="${esc(step.title)}" style="width:5.5em;text-align:right">${step.unit ? ` <span class="muted">${esc(step.unit)}</span>` : ''}`;
    case 'choice':
      return `<select data-fchange="${ID}:choice" ${data} aria-label="${esc(step.title)}"><option value="">Choose…</option>${(step.options ?? []).map(o => `<option${a?.choice === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    case 'entries': {
      if (a?.done) {
        const rows = a.entries ?? [];
        return rows.length
          ? `<div class="muted" style="font-size:13px">${rows.map(r => esc(Object.values(r).join(' — '))).join('<br>')}</div>`
          : '<span class="flag ok">None found</span>';
      }
      const key = draftKey(s.id, step.id), rows = drafts.get(key) ?? [];
      const fields = (step.fields ?? []).map(f => `<select data-field="${esc(f.id)}" aria-label="${esc(f.label)}" style="min-width:0;flex:1 1 9em"><option value="">${esc(f.label)}…</option>${f.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`).join('');
      return `<div class="fg" style="gap:6px;width:100%" data-entries="${esc(key)}">
        ${rows.map(r => `<div class="muted" style="font-size:13px">• ${esc(Object.values(r).join(' — '))}</div>`).join('')}
        <div class="ctl" style="gap:6px">${fields}<button class="btn sm" data-act="${ID}:addEntry" ${data}>Add</button></div>
        <div class="ctl" style="gap:6px"><button class="btn sm" data-act="${ID}:submitEntries" ${data}>${rows.length ? `Submit ${rows.length}` : 'None found'}</button></div></div>`;
    }
  }
}

function visitPanel(state: SimState, s: Store, atWork: boolean, merchId: string): string {
  const prog = visitProgress(state, s), vs = visitState(state);
  if (!prog.steps.length) return '';
  const closed = vs.closed[s.id] != null;
  let lastPhase = '';
  const items = prog.steps.map(step => {
    const a = s.answers[step.id], done = isAnswered(step, a), locked = closed || (step.needsProduct && !atWork);
    const head = step.phase !== lastPhase ? `<div class="lbl" style="margin-top:8px">${PHASE_LABEL[step.phase]}</div>` : '';
    lastPhase = step.phase;
    const isNext = prog.next?.id === step.id && !closed;
    return `${head}<div class="visit-step" style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--soft)${isNext ? ';background:color-mix(in srgb,var(--work) 8%,transparent);margin:0 -8px;padding:8px' : ''}">
      <span style="flex:none;width:18px;color:${done ? 'var(--ok)' : 'var(--muted)'};font-weight:700">${done ? '✓' : step.required ? '•' : '○'}</span>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div><b style="font-size:14px">${esc(step.title)}</b>${step.required ? '' : ' <span class="muted" style="font-size:12px">optional</span>'}${a?.auto ? ' <span class="muted" style="font-size:12px">auto</span>' : ''}
          ${step.detail ? `<div class="muted" style="font-size:12.5px">${esc(step.detail)}</div>` : ''}
          ${locked && !closed ? '<div class="muted" style="font-size:12px">Available once the truck is in and receiving is open</div>' : ''}</div>
        <div class="ctl" style="gap:8px">${stepInput(s, step, a, !!locked)}${photoControl(s, step, a, !!locked)}</div>
      </div></div>`;
  }).join('');
  const playing = !!vs.playing[merchId];
  const pct = prog.required ? Math.round((prog.doneRequired / prog.required) * 100) : 100;
  return `<div class="fg" style="gap:6px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="lbl">Store visit</span><span class="mono muted" style="font-size:12px">${prog.doneRequired}/${prog.required} required</span></div>
    <div class="prog"><i style="width:${pct}%;background:var(--ok)"></i></div>
    <label class="ctl" style="font-size:13px;gap:8px"><input type="checkbox" data-fchange="${ID}:play" data-m="${esc(merchId)}"${playing ? ' checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)">
      <span>I'm playing this merchandiser — keep the visit open until I close out</span></label>
    <div>${items}</div>
    ${closed ? `<div class="flag ok">Closed out at ${fmt(vs.closed[s.id])}</div>`
      : `<button class="btn pri" data-act="${ID}:closeOut" data-store="${esc(s.id)}"${canCloseOut(state, s) ? '' : ' disabled'} style="justify-content:center;padding:10px">Close out visit</button>
         ${!prog.complete ? `<div class="muted" style="font-size:12px">${prog.required - prog.doneRequired} required step${prog.required - prog.doneRequired === 1 ? '' : 's'} left before you can close out.</div>` : ''}`}
  </div>`;
}

/** The single "what do I do now" card (BR-015). */
function nextCard(state: SimState, merchId: string): string {
  const cv = currentVisit(state, merchId);
  if (!cv) return '';
  const { p, st, s } = cv;
  let big = '', small = '';
  if (s) {
    const prog = visitProgress(state, s), closed = visitState(state).closed[s.id] != null;
    if (st.k === 'wait') { big = prog.next && !prog.next.needsProduct ? prog.next.title : 'Wait for the truck'; small = `Product ready at ${fmt(readyAt(state, s))} · ${s.name}` }
    else if (closed) { big = 'Head to your next stop'; small = s.name + ' is closed out' }
    else if (prog.complete) { big = 'Close out the visit'; small = `All required steps done at ${s.name}` }
    else { big = prog.next?.title ?? 'Work the store'; small = `${s.name} · step ${prog.doneRequired + 1} of ${prog.required}` }
  } else if (st.k === 'drive' && st.stop) {
    big = `Drive to ${st.stop.s.name}`; small = `Arrive ${fmt(st.stop.arrive)} · ${(st.stop.km * KM_TO_MI).toFixed(1)} mi`;
  } else if (st.k === 'off' && st.stop) {
    big = `Leave by ${fmt(st.stop.depart)}`; small = `First stop: ${st.stop.s.name}`;
  } else if (st.k === 'idle' && st.stop) {
    big = `Next: ${st.stop.s.name}`; small = `Leave at ${fmt(st.stop.depart)}`;
  } else if (st.k === 'done') {
    big = 'Day complete'; small = `${p.stops.length} stops · clocked out ${fmt(p.clockOut)}`;
  } else return '';
  return `<div style="border-radius:12px;padding:12px 14px;background:var(--accent);color:var(--accent-ink)">
    <div class="lbl" style="color:inherit;opacity:.8">Next</div>
    <div style="font-family:var(--display);font-size:19px;font-weight:700;line-height:1.2">${esc(big)}</div>
    <div style="font-size:13px;opacity:.9">${esc(small)}</div></div>`;
}

export const panels: Panel[] = [
  { slot: 'merch.top', render: ({ state, selM }) => nextCard(state, selM) },
  {
    slot: 'merch.visit',
    render({ state, selM }) {
      const cv = currentVisit(state, selM);
      return cv?.s ? visitPanel(state, cv.s, cv.st.k === 'work', selM) : '';
    },
  },
  {
    slot: 'super.main',
    order: 10,
    render({ state, scope }) {
      const vs = visitState(state);
      const rows = state.stores.filter(s => scope.store(s) && s.lock && state.t >= s.lock.arrive).map(s => {
        const prog = visitProgress(state, s), m = merchById(state, s.assign ?? '');
        const closed = vs.closed[s.id];
        const autoN = Object.values(s.answers).filter(a => a.auto).length;
        return `<tr><td class="sname">${esc(s.name)}<small>${esc(m?.name ?? '')}${m && vs.playing[m.id] ? ' · played' : ''}</small></td>
          <td class="n">${prog.doneRequired}/${prog.required}</td>
          <td>${closed != null ? `<span class="flag ok">closed ${fmt(closed)}</span>` : '<span class="flag" style="color:var(--work)">open</span>'}${autoN ? ` <span class="muted" style="font-size:12px">${autoN} auto</span>` : ''}</td></tr>`;
      }).join('');
      return rows ? `<div class="panel"><div class="ph"><h2>Store visits</h2><span class="muted" style="font-size:12.5px">BR-002 · required steps done</span></div>
        <div class="tw"><table style="min-width:0"><thead><tr><th>Store</th><th class="n">Steps</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>` : '';
    },
  },
];

const store = (app: AppApi, el: HTMLElement) => storeById(app.state, el.dataset.store ?? '');

export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  check(app, el) { const s = store(app, el); if (s) { answerStep(app.state, s, el.dataset.step!, { done: el.checked }); app.refresh() } },
  count(app, el) { const s = store(app, el); if (s && el.value !== '') { answerStep(app.state, s, el.dataset.step!, { count: Math.max(0, Number(el.value)) }); el.blur(); app.refresh() } },
  choice(app, el) { const s = store(app, el); if (s && el.value) { answerStep(app.state, s, el.dataset.step!, { choice: el.value }); el.blur(); app.refresh() } },
  photo(app, el) {
    const s = store(app, el), file = el.files?.[0];
    if (!s || !file) return;
    answerStep(app.state, s, el.dataset.step!, { photo: { name: file.name || 'photo.jpg', at: app.state.t, url: URL.createObjectURL(file) } });
    app.toast('Photo attached');
    app.refresh();
  },
  play(app, el) {
    setPlaying(app.state, el.dataset.m!, el.checked);
    app.toast(el.checked ? 'You\'re playing — visits wait for you to close out' : 'Back to simulated');
    app.refresh();
  },
};

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  addEntry(app, el) {
    const s = store(app, el);
    if (!s) return;
    const key = draftKey(s.id, el.dataset.step!), box = el.closest(`[data-entries]`);
    const row: Record<string, string> = {};
    for (const sel of box?.querySelectorAll<HTMLSelectElement>('select[data-field]') ?? []) {
      if (!sel.value) { app.toast(`Pick ${sel.getAttribute('aria-label')?.toLowerCase()}`); return }
      row[sel.dataset.field!] = sel.value;
    }
    drafts.set(key, [...(drafts.get(key) ?? []), row]);
    app.refresh();
  },
  submitEntries(app, el) {
    const s = store(app, el);
    if (!s) return;
    const key = draftKey(s.id, el.dataset.step!), rows = drafts.get(key) ?? [];
    answerStep(app.state, s, el.dataset.step!, { done: true, entries: rows });
    drafts.delete(key);
    app.toast(rows.length ? `${rows.length} reported` : 'Marked none found');
    app.refresh();
  },
  closeOut(app, el) {
    const s = store(app, el);
    if (s && closeOut(app.state, s)) { app.toast(`${s.name} closed out`); app.refresh() }
  },
};
