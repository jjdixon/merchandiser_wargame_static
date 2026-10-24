import type { Feature } from '../../app/feature';
import { br039PhotoCaptureEngine } from './engine';
import { actions, panels } from './ui';

export const br039PhotoCapture: Feature = { ...br039PhotoCaptureEngine, panels, actions };
