import { describe, expect, it } from 'vitest';
import { tipFor, tipViews } from './engine';

describe('br-030-first-run-tips [BR-030]', () => {
  it('has a short tip for every core tab', () => {
    for (const v of ['sched', 'merch', 'super', 'week', 'rules']) expect(tipFor(v)?.text.length).toBeGreaterThan(20);
    for (const v of tipViews()) expect(tipFor(v)!.text.split(' ').length).toBeLessThanOrEqual(45);
    expect(tipFor('nope')).toBeNull();
  });
});
