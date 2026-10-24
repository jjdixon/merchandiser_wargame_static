import { fmt } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';

export const alertsPanel: Panel = {
  slot: 'super.aside',
  render: ({ state }) => `<div class="panel"><div class="ph"><h2>Alerts</h2><span class="muted mono" style="font-size:12px">${state.alerts.length}</span></div>
    <div class="alerts">${state.alerts.length
      ? state.alerts.map(a => `<div class="al ${a.sev}"><span class="tm">${fmt(a.t)}</span><span>${esc(a.text)}</span></div>`).join('')
      : '<div class="empty"><strong>Quiet so far</strong>Press Run, or throw a curveball from the bar above.</div>'}</div></div>`,
};
