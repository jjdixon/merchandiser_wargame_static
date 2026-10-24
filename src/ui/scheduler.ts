import { allPlans, fmt, hrs, merchById, money, totals, workMin, type Stop } from '../engine';
import { LEGEND, crewCard, esc, gantt, type ViewCtx } from './shared';

export function schedulerView(ctx: ViewCtx): string {
  const { state, scope } = ctx, r = state.rules, plans = allPlans(state).filter(p => scope.merch(p.m));
  const idx: Record<string, Stop> = {};
  plans.forEach(p => p.stops.forEach(x => (idx[x.s.id] = x)));
  const mi = (id: string | null) => (id ? state.merch.findIndex(m => m.id === id) : -1);
  const order = state.stores.filter(scope.store).sort((a, b) => mi(a.assign) - mi(b.assign) || (idx[a.id]?.depart ?? 0) - (idx[b.id]?.depart ?? 0));

  const rows = order.map(s => {
    const x = idx[s.id], lk = s.lock, started = lk && state.t >= lk.start;
    const opts = `<option value="">— Unassigned —</option>` + state.merch.filter(m => scope.merch(m) && (!m.out || m.id === s.assign))
      .map(m => `<option value="${m.id}"${s.assign === m.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
    const phase = !lk ? '' : state.t >= lk.end ? '<span class="flag ok">Done</span>' : started ? '<span class="flag" style="color:var(--work)">In progress</span>' : '<span class="flag muted">En route</span>';
    const flags = [phase,
      x && x.wait > 3 ? `<span class="flag wait">wait ${Math.round(x.wait)}m</span>` : '',
      x && x.end > s.win ? '<span class="flag late">late</span>' : '',
      !s.assign ? '<span class="flag late">needs coverage</span>' : ''].filter(Boolean).join(' · ');
    return `<tr class="${s.assign ? '' : 'un'}">
      <td><div class="sname">${esc(s.name)}<small>${esc(s.routeType)}${s.pullUp ? ' · pull-up' : ''} · ${s.extra ? '+' + s.extra + ' min added · ' : ''}${Math.round(workMin(state, s))} min labor</small></div></td>
      <td class="n">${s.trays} · ${s.cases}</td><td class="n">${fmt(s.eta)}</td><td class="n">${fmt(s.win)}</td>
      <td>${lk ? `<span class="muted">${esc(merchById(state, s.assign!)?.name ?? '')}</span>` : `<select data-assign="${s.id}" aria-label="Assign ${esc(s.name)}">${opts}</select>`}</td>
      <td>${!lk && s.assign ? `<span class="ord"><button data-act="up" data-id="${s.id}" aria-label="Earlier">↑</button><button data-act="dn" data-id="${s.id}" aria-label="Later">↓</button></span>` : ''}</td>
      <td class="n">${x ? fmt(x.start) + '–' + fmt(x.end) : '—'}</td>
      <td>${flags}</td></tr>`;
  }).join('');

  const t = totals(plans);
  return `
  <section class="grid crew">${plans.map(p => crewCard(state, p)).join('')}</section>
  <section class="panel"><div class="ph"><h2>Day timeline</h2>${LEGEND}</div>${gantt(state, plans)}</section>
  <section class="panel">
    <div class="ph"><h2>Store assignments</h2>
      <div class="ctl"><span class="muted mono" style="font-size:12.5px">${hrs(t.paid)} paid · ${money(t.cost)} · ${t.costPerUnit.toFixed(2)} $/unit</span><button class="btn" data-act="auto">Auto-assign open stops</button></div></div>
    <div class="tw"><table><thead><tr><th>Store</th><th class="n">Trays · Cases</th><th class="n">Truck</th><th class="n">Done by</th><th>Merchandiser</th><th>Order</th><th class="n">Planned</th><th>Flags</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="pb note">Base labor per stop = ${r.fixed} min fixed + ${r.mpt} min × trays + ${r.mpc} min × cases; work can't start until ${r.buffer} min after the truck arrives (Pay &amp; labor rules). Enabled features such as per-store standards and store hours adjust these — see the panels below. Auto-assign is a simple greedy pass ordered by truck time — good enough to argue with.</div>
  </section>
  ${ctx.slot('sched.after')}`;
}
