// Pay & labor rules screen. Settings come from enabled features (ctx.settings);
// the feature list with on/off switches comes from the registry (ctx.catalog).
import { allPlans, getRule, money, totals, type Setting } from '../engine';
import { esc, type ViewCtx } from './shared';

function field(ctx: ViewCtx, x: Setting): string {
  const v = getRule(ctx.state.rules, x.key);
  const id = 'r-' + x.key.replace(/[^\w-]/g, '_');
  return x.type === 'boolean'
    ? `<label class="fi ck"><span>${esc(x.label)}<small>${esc(x.help)}</small></span><input type="checkbox" id="${id}" data-k="${esc(x.key)}"${v ? ' checked' : ''}></label>`
    : `<label class="fi"><span>${esc(x.label)}<small>${esc(x.help)}</small></span><input type="number" step="${x.step ?? 1}" id="${id}" data-k="${esc(x.key)}" value="${esc(v ?? '')}"></label>`;
}

export function rulesView(ctx: ViewCtx): string {
  const R = ctx.state.rules, t = totals(allPlans(ctx.state));
  const sections = new Map<string, Setting[]>();
  for (const x of ctx.settings) sections.set(x.section, [...(sections.get(x.section) ?? []), x]);
  const kpi = (label: string, value: string, bad = false) => `<div class="kpi${bad ? ' bad' : ''}"><span class="lbl">${label}</span><b>${value}</b></div>`;

  const features = ctx.catalog.map(f => `<label class="fi ck" style="align-items:start">
      <span><b>${esc(f.title)}</b>${f.requirements.length ? ` <span class="mono muted" style="font-size:11.5px">${esc(f.requirements.join(' · '))}</span>` : ''}<small>${esc(f.description)}${f.locked ? ' Always on.' : ''}</small></span>
      <input type="checkbox" data-act="feature-toggle" data-id="${esc(f.id)}" id="feat-${esc(f.id)}"${f.on ? ' checked' : ''}${f.locked ? ' disabled' : ''}></label>`).join('');

  return `
  <section class="form">${[...sections].map(([name, xs]) =>
    `<div class="panel"><div class="ph"><h2>${esc(name)}</h2></div><div class="pb fg">${xs.map(x => field(ctx, x)).join('')}</div></div>`).join('')}
  </section>
  <section class="panel"><div class="ph"><h2>What today costs under these rules</h2><button class="btn sm" data-act="rreset">Restore defaults</button></div>
    <div class="pb grid" style="gap:10px">
      <div class="kpis">
        ${kpi('Regular hours', t.reg.toFixed(1))}
        ${kpi('Overtime hours', t.oth.toFixed(1), t.oth > 0)}
        ${kpi('Labor', money(t.labor))}
        ${kpi('Mileage', money(t.mileage))}
        ${kpi('Cost per unit', '$' + t.costPerUnit.toFixed(2))}
      </div>
      <div class="math">paid = in-store work + truck waits${R.paidBetween ? ' + drives between stores' : ''}${R.paidCommute ? ' + drive to first store' : ''}
labor = regular × $${R.wage} + OT × $${(R.wage * 1.5).toFixed(2)}     (OT once week hours pass ${R.ot})
today: ${Math.round(t.wait)} min paid waiting on trucks · ${Math.round(t.driveBetween)} min between-store driving · ${t.miles.toFixed(0)} reimbursed mi</div>
      <p class="note" style="margin:0">Flip a rule and watch the scheduler and supervisor views change. These defaults are placeholders, not legal advice — have employment counsel confirm which travel time is compensable in each state you operate in.</p>
    </div>
  </section>
  <section class="panel"><div class="ph"><h2>Features</h2><span class="muted" style="font-size:12.5px">Switch a feature off to war-game the day without it</span></div>
    <div class="pb fg">${features}</div>
  </section>
  ${ctx.slot('rules.after')}`;
}
