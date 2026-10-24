import type { Feature } from '../../app/feature';
import { curveballsEngine } from './engine';

// Screen-wise, curveballs appear in the header bar, which the app shell builds
// from every enabled feature's curveballs. Nothing extra to declare here.
export const curveballs: Feature = { ...curveballsEngine };
