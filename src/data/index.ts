// Seed data loader. Swap these JSON files for real exports — see docs/data.md.
import type { MerchRow, RulesRow, Scenario, Seed, StoreRow } from '../engine';
import stores from './stores.json';
import merch from './merchandisers.json';
import rules from './rules.json';
import scenarios from './scenarios.json';
import lists from './lists.json';

export const seed: Seed = {
  stores: stores as StoreRow[],
  merch: merch as MerchRow[],
  rules: rules as RulesRow,
  scenarios: scenarios as Scenario[],
};
export const ISSUES: string[] = lists.issues;
