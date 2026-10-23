import type { Minutes } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 330 → "5:30a". Returns an em dash for null/NaN. */
export function fmt(m: Minutes | null | undefined): string {
  if (m == null || !isFinite(m)) return '—';
  const r = Math.round(m);
  const h = Math.floor(r / 60) % 24;
  const mm = r % 60;
  return (h % 12 || 12) + ':' + pad(mm) + (h < 12 ? 'a' : 'p');
}

/** "05:30" → 330. Throws on malformed input so bad seed data fails loudly. */
export function parseHHMM(s: string): Minutes {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) throw new Error(`Bad time "${s}" — expected HH:MM (24-hour)`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export const hrs = (m: Minutes) => (m / 60).toFixed(1) + 'h';
export const money = (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
