import type { Feature } from '../../app/feature';
import { br026ExceptionsEngine } from './engine';
import { actions, changes, exceptionsView } from './ui';

export const br026Exceptions: Feature = { ...br026ExceptionsEngine, actions, changes, views: [exceptionsView] };
