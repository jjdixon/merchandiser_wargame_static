// Messages tab (everyone), a compact thread on the phone, and compose forms.
import { fmt, merchById, plan, status, type SimState } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel, ViewCtx, ViewDef } from '../../app/feature';
import { ID, ROLES, labelFor, msgs, send, visibleMessages, type Message, type Role } from './engine';

function bubble(state: SimState, m: Message): string {
  return `<div class="al ${m.auto ? 'info' : 'warn'}" style="grid-template-columns:54px 1fr"><span class="tm">${fmt(m.at)}</span>
    <span><b>${esc(m.from)}</b> → ${esc(m.to)} <span class="muted">· ${esc(labelFor(state, m.storeId))}</span><br>${esc(m.text)}</span></div>`;
}

function compose(stores: Array<{ id: string; name: string }>, preset: string | null, idSuffix: string): string {
  return `<form class="fg" style="gap:6px" data-compose="${idSuffix}" onsubmit="return false">
    <div class="ctl" style="gap:6px">
      <select id="msgTo-${idSuffix}" aria-label="Send to">${ROLES.map(r => `<option>${r}</option>`).join('')}</select>
      <select id="msgStore-${idSuffix}" aria-label="About store" style="min-width:0;flex:1"><option value="">General</option>${stores.map(s => `<option value="${esc(s.id)}"${s.id === preset ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    </div>
    <div class="ctl" style="gap:6px"><input type="text" id="msgText-${idSuffix}" placeholder="Message" style="flex:1;min-width:0" aria-label="Message">
      <button class="btn pri" data-act="${ID}:send" data-box="${idSuffix}">Send</button></div></form>`;
}

const sender = (ctx: { scope: { label: string | null } }) => {
  const v = ctx.scope.label?.split(' · ');
  return v ? v.slice(0, v[0] === 'MSL' ? 2 : 1).join(' ') : 'Facilitator';
};

export const messagesView: ViewDef = {
  id: 'messages',
  label: 'Messages',
  public: true,
  render(ctx: ViewCtx) {
    const { state, scope } = ctx;
    const list = visibleMessages(state, scope.store);
    const stores = state.stores.filter(scope.store);
    return `<section class="panel"><div class="ph"><h2>Messages</h2><span class="muted" style="font-size:12.5px">BR-028 · sending as <b>${esc(sender(ctx))}</b> · replies are simulated</span></div>
      <div class="pb">${compose(stores, null, 'tab')}</div>
      <div class="alerts" style="max-height:none">${list.length ? list.slice().reverse().map(m => bubble(state, m)).join('') : '<div class="empty"><strong>No messages yet</strong>Send one, or run the day: drivers post when a truck slips.</div>'}</div></section>`;
  },
};

export const panels: Panel[] = [{
  slot: 'merch.after',
  order: 1,
  render(ctx) {
    const { state, selM } = ctx, m = merchById(state, selM);
    if (!m) return '';
    const p = plan(state, m), mine = new Set(p.stops.map(x => x.s.id));
    const list = msgs(state).list.filter(x => x.storeId && mine.has(x.storeId)).slice(-4).reverse();
    const cur = status(state, p).stop?.s.id ?? null;
    return `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Messages</span>
      ${compose(p.stops.map(x => x.s), cur, 'phone')}
      <div class="alerts" style="margin:0 -16px">${list.map(x => bubble(state, x)).join('') || '<div class="muted" style="padding:8px 16px">Nothing about your stops yet.</div>'}</div></div></div>`;
  },
}];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  send(app, el) {
    const k = el.dataset.box!;
    const text = (document.getElementById(`msgText-${k}`) as HTMLInputElement | null)?.value ?? '';
    const to = (document.getElementById(`msgTo-${k}`) as HTMLSelectElement | null)?.value as Role;
    const storeId = (document.getElementById(`msgStore-${k}`) as HTMLSelectElement | null)?.value || null;
    const m = merchById(app.state, app.selM);
    const v = app.viewer?.split(' · ') ?? null;
    const from = k === 'phone' && m ? m.name : v ? v.slice(0, v[0] === 'MSL' ? 2 : 1).join(' ') : 'Facilitator';
    if (!send(app.state, from, to, storeId, text)) { app.toast('Type a message first'); return }
    app.toast(`Sent to ${to}`);
    app.refresh();
  },
};
