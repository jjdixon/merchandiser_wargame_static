// Feature registry plumbing (engine side). Pure.
// Features plug into the core through SimState.ext; see docs/architecture.md.
import type { EngineFeature, Extensions, Rules, SimState } from './types';

export const emptyExtensions = (): Extensions => ({ readyAt: [], workMinutes: [], onTick: [], curveballs: [], settings: [] });

/** Combine the plug-ins of the given (enabled) features, in order. */
export function buildExtensions(features: EngineFeature[]): Extensions {
  const ext = emptyExtensions();
  for (const f of features) {
    if (f.readyAt) ext.readyAt.push(f.readyAt);
    if (f.workMinutes) ext.workMinutes.push(f.workMinutes);
    if (f.onTick) ext.onTick.push(f.onTick);
    if (f.curveballs) ext.curveballs.push(...f.curveballs);
    if (f.settings) ext.settings.push(...f.settings);
  }
  return ext;
}

/** Fill in defaults for feature-owned settings that aren't set yet. */
export function withFeatureDefaults(rules: Rules, features: EngineFeature[]): Rules {
  const feature = { ...rules.feature };
  for (const f of features)
    for (const [k, v] of Object.entries(f.ruleDefaults ?? {}))
      if (!(k in feature)) feature[k] = v;
  return { ...rules, feature };
}

/**
 * Switch the state to use exactly these features. Safe mid-day: stops already
 * departed for are locked, so only the rest of the day changes.
 */
export function enableFeatures(state: SimState, features: EngineFeature[]): void {
  state.ext = buildExtensions(features);
  state.enabled = features.map(f => f.id);
  state.rules = withFeatureDefaults(state.rules, features);
}

/**
 * A feature's own day-scoped state, created on first use. Survives the feature
 * being switched off and on mid-day; reset when a new day starts.
 */
export function featureState<T>(state: SimState, featureId: string, init: () => T): T {
  if (!(featureId in state.fx)) state.fx[featureId] = init();
  return state.fx[featureId] as T;
}

const CORE_KEYS = new Set(['shiftStart', 'buffer', 'mpc', 'fixed', 'speed', 'road', 'paidBetween', 'paidCommute', 'ot', 'wage', 'mileage']);
export const isCoreRule = (key: string) => CORE_KEYS.has(key);

export function getRule(rules: Rules, key: string): number | boolean | undefined {
  return isCoreRule(key) ? (rules as unknown as Record<string, number | boolean>)[key] : rules.feature[key];
}
export function setRule(rules: Rules, key: string, value: number | boolean): void {
  if (isCoreRule(key)) (rules as unknown as Record<string, number | boolean>)[key] = value;
  else rules.feature[key] = value;
}
/** Typed read of a feature-owned number setting with a fallback. */
export const ruleNum = (rules: Rules, key: string, fallback: number) => {
  const v = rules.feature[key];
  return typeof v === 'number' ? v : fallback;
};
export const ruleBool = (rules: Rules, key: string, fallback: boolean) => {
  const v = rules.feature[key];
  return typeof v === 'boolean' ? v : fallback;
};
