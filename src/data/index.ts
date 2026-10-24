// Seed data loader. Swap these JSON files for real exports — see docs/data.md.
import type { MerchRow, RulesRow, Scenario, Seed, StoreRow } from '../engine';
import stores from './stores.json';
import merch from './merchandisers.json';
import rules from './rules.json';
import scenarios from './scenarios.json';
import lists from './lists.json';
import week from './week.json';

export const seed: Seed = {
  stores: stores as StoreRow[],
  merch: merch as MerchRow[],
  rules: rules as RulesRow,
  scenarios: scenarios as Scenario[],
  week: { patterns: week.patterns, pullUpShare: week.pullUpShare },
};
export const ISSUES: string[] = lists.issues;
