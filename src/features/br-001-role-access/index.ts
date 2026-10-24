import type { Feature } from '../../app/feature';
import { br001RoleAccessEngine } from './engine';
import { access, changes, panels } from './ui';

export const br001RoleAccess: Feature = { ...br001RoleAccessEngine, panels, changes, access };
