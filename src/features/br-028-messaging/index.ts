import type { Feature } from '../../app/feature';
import { br028MessagingEngine } from './engine';
import { actions, messagesView, panels } from './ui';

export const br028Messaging: Feature = { ...br028MessagingEngine, panels, actions, views: [messagesView] };
