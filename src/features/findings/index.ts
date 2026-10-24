import type { Feature } from '../../app/feature';
import { findingsActions, findingsView, mountFindings } from './ui';

export const findings: Feature = {
  id: 'findings',
  title: 'Findings log',
  description: 'The “This won\'t work because…” button and the Findings tab — the war game\'s output.',
  requirements: [],
  defaultOn: true,
  locked: true,
  views: [findingsView],
  actions: findingsActions,
  mount: mountFindings,
};
