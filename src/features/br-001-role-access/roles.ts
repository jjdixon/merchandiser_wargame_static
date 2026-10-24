// BR-001 Role-based access: who can see which screens, people and stores.
// Pure (no DOM): takes the sim state and a role id, returns what that role sees.
import type { Merchandiser, SimState, Store } from '../../engine';
import type { Access } from '../../app/feature';

export interface RoleOption { id: string; label: string; group: 'Facilitator' | 'Portal' | 'Mobile' }

const FIELD_WORD = { merchandiser: 'Merchandiser', relief: 'Vacation relief', jumper: 'Route jumper' } as const;

/** Every role you can view the app as, given who's in today's data. */
export function roleOptions(state: SimState): RoleOption[] {
  const markets = [...new Set(state.merch.map(m => m.market).filter(Boolean))].sort();
  return [
    { id: 'facilitator', label: 'Facilitator (sees everything)', group: 'Facilitator' },
    { id: 'scheduler', label: 'LF Merchandiser Scheduler', group: 'Portal' },
    { id: 'manager', label: 'LF Merchandiser Manager', group: 'Portal' },
    ...markets.map(mk => ({ id: `msl:${mk}`, label: `MSL — ${mk} market`, group: 'Mobile' as const })),
    ...state.merch.map(m => ({ id: `field:${m.id}`, label: `${m.name} (${FIELD_WORD[m.role]})`, group: 'Mobile' as const })),
  ];
}

/**
 * What a role may see. Least privilege:
 * - Scheduler: builds the day — Scheduler, Supervisor and phone views, all stores.
 * - Manager: oversight — Supervisor and Scheduler views, all stores.
 * - MSL: their market only — Supervisor and phone views.
 * - Merchandiser / relief / jumper: their own phone and their own stops only.
 * Public tabs (Findings) stay visible to everyone.
 * Returns null for the facilitator (no limits) or an unknown role.
 */
export function accessFor(state: SimState, roleId: string): Access | null {
  if (roleId === 'scheduler') return { views: ['sched', 'super', 'merch'], label: 'LF Merchandiser Scheduler · portal' };
  if (roleId === 'manager') return { views: ['super', 'sched'], label: 'LF Merchandiser Manager · portal' };
  if (roleId.startsWith('msl:')) {
    const mk = roleId.slice(4);
    return {
      views: ['super', 'merch'],
      merch: (m: Merchandiser) => m.market === mk,
      store: (s: Store) => s.market === mk,
      label: `MSL · ${mk} market · mobile`,
    };
  }
  if (roleId.startsWith('field:')) {
    const id = roleId.slice(6), m = state.merch.find(x => x.id === id);
    if (!m) return null;
    return {
      views: ['merch'],
      merch: (x: Merchandiser) => x.id === id,
      store: (s: Store) => s.assign === id,
      lockMerch: id,
      label: `${m.name} · ${FIELD_WORD[m.role]} · mobile`,
    };
  }
  return null;
}
