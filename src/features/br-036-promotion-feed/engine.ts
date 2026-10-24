// BR-036 Promotion and display data feed (simulated).
// Promotions and display standards come from seed data (promotions.json) or from a
// spreadsheet pasted on the Promotions tab. Each promotion becomes one display task
// per matching store (core: tasksFromPromotions). Loading a promotion again with
// changes bumps its version; the log keeps what changed.
import {
  DAYS, tasksFromPromotions, weekState,
  type EngineFeature, type Promotion, type RouteType, type SimState,
} from '../../engine';
import { seed } from '../../data';
import DATA from './promotions.json';

export const ID = 'br-036-promotion-feed';
const SEEDED = DATA.promotions as Promotion[];

export interface VersionLog { id: string; version: number; day: number; at: number; changed: string[]; source: 'seed' | 'paste' }
interface Feed { pasted: Promotion[]; log: VersionLog[] }
export const feed = (state: SimState) => weekState<Feed>(state, ID, () => ({ pasted: [], log: [] }));

/** Seeded promotions, with pasted ones replacing the same id. */
export function promotions(state: SimState): Promotion[] {
  const pasted = feed(state).pasted, ids = new Set(pasted.map(p => p.id));
  return [...SEEDED.filter(p => !ids.has(p.id)), ...pasted];
}

/** Rebuild today's display tasks from the promotions (all seed stores). */
export function loadTasks(state: SimState): void {
  state.displays.tasks = tasksFromPromotions(promotions(state), seed.stores);
}

/* ---------- pasted spreadsheet ---------- */
export const COLUMNS = ['id', 'name', 'brand', 'productGroup', 'displayType', 'fixture', 'location', 'products', 'instructions', 'start', 'end', 'checkEvery', 'stores', 'banners', 'markets', 'routeTypes'] as const;

/** "Thu" / "thursday" / "3" / "-2" → day number. */
export function parseDay(v: string): number | null {
  const t = v.trim().toLowerCase();
  if (/^-?\d+$/.test(t)) return Number(t);
  const i = DAYS.findIndex(d => t.startsWith(d.toLowerCase()));
  return i >= 0 ? i : null;
}

export interface ParseResult { promotions: Promotion[]; errors: string[] }

/** Tab- or comma-separated rows with a header row. Lists inside a cell use ";". */
export function parseSheet(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim());
  if (!lines.length) return { promotions: [], errors: ['Nothing pasted'] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const head = lines[0].split(sep).map(h => h.trim());
  const norm = (h: string) => COLUMNS.find(c => c.toLowerCase() === h.toLowerCase().replace(/[\s_]/g, ''));
  const cols = head.map(norm);
  const errors: string[] = [];
  for (const need of ['id', 'name', 'start', 'end'] as const) if (!cols.includes(need)) errors.push(`Missing column "${need}"`);
  if (errors.length) return { promotions: [], errors };
  const out: Promotion[] = [];
  lines.slice(1).forEach((line, n) => {
    const cells = line.split(sep), row: Record<string, string> = {};
    cols.forEach((c, i) => { if (c) row[c] = (cells[i] ?? '').trim() });
    const start = parseDay(row.start ?? ''), end = parseDay(row.end ?? '');
    if (!row.id || !row.name) { errors.push(`Row ${n + 2}: id and name are required`); return }
    if (start == null || end == null) { errors.push(`Row ${n + 2}: start/end must be a day (Mon…Sun) or a number`); return }
    const list = (k: string) => (row[k] ? row[k].split(';').map(x => x.trim()).filter(Boolean) : undefined);
    out.push({
      id: row.id, version: 1, name: row.name, brand: row.brand || '—', productGroup: row.productGroup || '—',
      displayType: row.displayType || row.fixture || 'Display', fixture: row.fixture || row.displayType || 'Display',
      location: row.location || '—', products: list('products') ?? [], instructions: row.instructions || '',
      start, end: Math.max(start, end), checkEvery: Math.max(1, Number(row.checkEvery) || 1),
      stores: list('stores'), banners: list('banners'), markets: list('markets'), routeTypes: list('routeTypes') as RouteType[] | undefined,
    });
  });
  return { promotions: out, errors };
}

const FIELDS: (keyof Promotion)[] = ['name', 'brand', 'productGroup', 'displayType', 'fixture', 'location', 'products', 'instructions', 'start', 'end', 'checkEvery', 'stores', 'banners', 'markets', 'routeTypes'];
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Load pasted promotions: new ids are added, changed ones get a new version. Returns what happened. */
export function loadPasted(state: SimState, list: Promotion[]): { added: number; updated: number; unchanged: number } {
  const f = feed(state), r = { added: 0, updated: 0, unchanged: 0 };
  for (const p of list) {
    const old = promotions(state).find(x => x.id === p.id);
    if (!old) { f.pasted.push(p); f.log.push({ id: p.id, version: 1, day: state.day, at: state.t, changed: ['new'], source: 'paste' }); r.added++; continue }
    const changed = FIELDS.filter(k => !same(old[k], p[k]));
    if (!changed.length) { r.unchanged++; continue }
    const next = { ...p, version: old.version + 1 };
    f.pasted = [...f.pasted.filter(x => x.id !== p.id), next];
    f.log.push({ id: p.id, version: next.version, day: state.day, at: state.t, changed, source: 'paste' });
    r.updated++;
  }
  loadTasks(state);
  return r;
}

/** A blank sheet header plus one example row, for people to copy. */
export const TEMPLATE = [COLUMNS.join('\t'),
  ['P-201', 'Game day buns', 'Hearthside', 'Buns & rolls', 'Endcap', 'Endcap', 'Aisle 9 endcap', 'Hamburger buns 8ct;Hot dog buns 8ct', 'Game day header card', 'Fri', 'Sun', '1', '', 'ValuMart', '', ''].join('\t')].join('\n');

export const br036PromotionFeedEngine: EngineFeature = {
  id: ID,
  title: 'Promotion feed',
  description: 'Promotions and display standards from seed data or a pasted spreadsheet become display tasks per store, with versions.',
  requirements: ['BR-036'],
  defaultOn: true,
  onDayStart: loadTasks,
};
