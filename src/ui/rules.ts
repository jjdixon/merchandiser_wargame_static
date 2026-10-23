import { allPlans, fmt, money, totals, type Rules } from '../engine';
import type { ViewCtx } from './shared';

type NumKey = { [K in keyof Rules]: Rules[K] extends number ? K : never }[keyof Rules];
type BoolKey = { [K in keyof Rules]: Rules[K] extends boolean ? K : never }[keyof Rules];

export function rulesView({ state }: ViewCtx): string {
  const R = state.rules, t = totals(allPlans(state));
  const num = (k: NumKey, label: string, help: string, step = 1) =>
    `<label class="fi"><span>${label}<small>${help}</small></span><input type="number" step="${step}" id="r-${k}" data-k="${k}" value="${R[k]}"></label>`;
  const ck = (k: BoolKey, label: string, help: string) =>
    `<label class="fi ck"><span>${label}<small>${help}</small></span><input type="checkbox" id="r-${k}" data-k="${k}"${R[k] ? ' checked' : ''}></label>`;
  const kpi = (label: string, value: string, bad = false) => `<div class="kpi${bad ? ' bad' : ''}"><span class="lbl">${label}</span><b>${value}</b></div>`;

  return `
  <section class="form">
    <div class="panel"><div class="ph"><h2>Labor standards</h2></div><div class="pb fg">
      ${num('mpc', 'Minutes per case', 'Work truck to shelf, incl. rotation', 0.05)}
      ${num('fixed', 'Fixed minutes per visit', 'Check-in, backroom, photos, paperwork')}
      ${num('buffer', 'Minutes after truck arrives', 'Receiving check-in before product is workable')}
    </div></div>
    <div class="panel"><div class="ph"><h2>Pay rules</h2></div><div class="pb fg">
      ${ck('paidBetween', 'Pay drive time between stores', 'Usually compensable — confirm with counsel')}
      ${ck('paidCommute', 'Pay drive from home to first store', 'Normally treated as commute — confirm')}
      ${num('ot', 'Weekly overtime after (hrs)', 'Time and a half beyond this')}
      ${num('wage', 'Hourly wage ($)', 'Single rate for the mock', 0.25)}
      ${num('mileage', 'Mileage rate ($/mi)', 'Reimbursed miles only', 0.01)}
    </div></div>
    <div class="panel"><div class="ph"><h2>Travel &amp; day</h2></div><div class="pb fg">
      ${num('speed', 'Average drive speed (km/h)', 'Town driving incl. lights')}
      ${num('road', 'Road factor', 'Straight-line → road distance', 0.05)}
      <label class="fi"><span>Earliest leave time<small>Set in src/data/rules.json</small></span><input type="text" id="r-ss" value="${fmt(R.shiftStart)}" readonly class="mono" style="width:92px;text-align:right"></label>
    </div></div>
  </section>
  <section class="panel"><div class="ph"><h2>What today costs under these rules</h2><button class="btn sm" data-act="rreset">Restore defaults</button></div>
    <div class="pb grid" style="gap:10px">
      <div class="kpis">
        ${kpi('Regular hours', t.reg.toFixed(1))}
        ${kpi('Overtime hours', t.oth.toFixed(1), t.oth > 0)}
        ${kpi('Labor', money(t.labor))}
        ${kpi('Mileage', money(t.mileage))}
        ${kpi('Cost per case', '$' + t.costPerCase.toFixed(2))}
      </div>
      <div class="math">paid = in-store work + truck waits${R.paidBetween ? ' + drives between stores' : ''}${R.paidCommute ? ' + drive to first store' : ''}
labor = regular × $${R.wage} + OT × $${(R.wage * 1.5).toFixed(2)}     (OT once week hours pass ${R.ot})
today: ${Math.round(t.wait)} min paid waiting on trucks · ${Math.round(t.driveBetween)} min between-store driving · ${t.miles.toFixed(0)} reimbursed mi</div>
      <p class="note" style="margin:0">Flip a rule and watch the scheduler and supervisor views change. These defaults are placeholders, not legal advice — have employment counsel confirm which travel time is compensable in each state you operate in.</p>
    </div>
  </section>`;
}
