// "Viewing as" picker in the header. The chosen role is remembered per browser.
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { accessFor, roleOptions } from './roles';

const KEY = 'mwg.role';
let role = (() => { try { return localStorage.getItem(KEY) ?? 'facilitator' } catch { return 'facilitator' } })();
export const currentRole = () => role;

export const panels: Panel[] = [{
  slot: 'header',
  render({ state }) {
    const opts = roleOptions(state);
    const groups = ['Facilitator', 'Portal', 'Mobile'] as const;
    return `<label class="lbl" for="roleSel">Viewing as</label>
      <select id="roleSel" data-fchange="br-001-role-access:setRole" style="max-width:15em">${groups.map(g =>
        `<optgroup label="${g}">${opts.filter(o => o.group === g).map(o => `<option value="${esc(o.id)}"${o.id === role ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  },
}];

export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  setRole(app, el) {
    role = el.value;
    try { localStorage.setItem(KEY, role) } catch { /* storage blocked */ }
    el.blur();
    app.toast(accessFor(app.state, role)?.label ?? 'Facilitator — sees everything');
    app.refresh();
  },
};

export const access = (app: AppApi) => accessFor(app.state, role);
