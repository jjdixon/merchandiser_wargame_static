// BR-001 Roles and access — engine part. Nothing to simulate: roles are about who
// is looking, not how the day runs. The logic lives in roles.ts (pure, tested).
import type { EngineFeature } from '../../engine';

export const br001RoleAccessEngine: EngineFeature = {
  id: 'br-001-role-access',
  title: 'Roles and access',
  description: 'A "Viewing as" picker in the header; each role sees only its screens, people and stores.',
  requirements: ['BR-001'],
  defaultOn: true,
};
