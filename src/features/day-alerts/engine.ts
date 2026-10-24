// Day alerts: watches the simulated day and raises one-time alerts.
// Runs on every clock step via onTick. Alerts raised by actions (call-outs,
// curveballs, merchandiser reports) come from elsewhere and land in the same feed.
import { allPlans, fmt, hrs, raise, readyAt, type EngineFeature, type SimState } from '../../engine';

/** Raise any alerts that are now true. Each fires at most once per day (keyed). */
export function checkDay(state: SimState): void {
  const r = state.rules;
  for (const p of allPlans(state)) {
    const m = p.m;
    for (const x of p.stops) {
      if (x.wait > 3 && state.t >= x.arrive && state.t < x.start)
        raise(state, 'warn', `${m.name} is at ${x.s.name} waiting on the truck — ${Math.round(x.wait)} min of paid idle time.`, 'w' + x.s.id + Math.round(x.s.eta));
      if (x.end > x.s.win && state.t >= x.s.win && state.t < x.end)
        raise(state, 'bad', `${x.s.name} passed its done-by time (${fmt(x.s.win)}). ${m.name} projects finishing ${fmt(x.end)}.`, 'l' + x.s.id);
    }
    if (p.weekProj > r.ot)
      raise(state, 'warn', `${m.name} projects ${p.weekProj.toFixed(1)} hrs this week — overtime after ${r.ot}.`, 'o' + m.id + (m.out ? 'x' : ''));
    if (p.stops.length && p.clockOut! <= state.t && !m.out)
      raise(state, 'info', `${m.name} clocked out at ${fmt(p.clockOut)} · ${hrs(p.paid)} paid.`, 'd' + m.id);
  }
  for (const s of state.stores)
    if (!s.assign && readyAt(state, s) <= state.t)
      raise(state, 'bad', `${s.name}: product is on the dock and nobody is assigned.`, 'u' + s.id);
}

export const dayAlertsEngine: EngineFeature = {
  id: 'day-alerts',
  title: 'Day alerts',
  description: 'Automatic alerts for truck waits, missed done-by times, overtime risk, uncovered stops and clock-outs, plus the alert feed.',
  requirements: ['BR-007', 'BR-014', 'BR-026'],
  defaultOn: true,
  onTick: checkDay,
};
