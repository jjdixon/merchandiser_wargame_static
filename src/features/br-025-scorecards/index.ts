import type { Feature } from '../../app/feature';
import { br025ScorecardsEngine } from './engine';
import { actions, panels, scorecardsView } from './ui';

export const br025Scorecards: Feature = { ...br025ScorecardsEngine, actions, panels, views: [scorecardsView] };
