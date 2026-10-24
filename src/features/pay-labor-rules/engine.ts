// Pay & labor rules: the switchable assumptions behind every hour and dollar.
// The calculations themselves are core (src/engine/plan.ts) because every
// screen depends on them; this feature owns how they're presented and edited.
import type { EngineFeature, Setting } from '../../engine';

const LABOR = 'Labor standards', PAY = 'Pay rules', TRAVEL = 'Travel & day';

export const settings: Setting[] = [
  { key: 'mpc', label: 'Minutes per case', help: 'Work truck to shelf, incl. rotation', type: 'number', step: 0.05, section: LABOR },
  { key: 'fixed', label: 'Fixed minutes per visit', help: 'Check-in, backroom, photos, paperwork', type: 'number', section: LABOR },
  { key: 'buffer', label: 'Minutes after truck arrives', help: 'Receiving check-in before product is workable', type: 'number', section: LABOR },
  { key: 'paidBetween', label: 'Pay drive time between stores', help: 'Usually compensable — confirm with counsel', type: 'boolean', section: PAY },
  { key: 'paidCommute', label: 'Pay drive from home to first store', help: 'Normally treated as commute — confirm', type: 'boolean', section: PAY },
  { key: 'ot', label: 'Weekly overtime after (hrs)', help: 'Time and a half beyond this', type: 'number', section: PAY },
  { key: 'wage', label: 'Hourly wage ($)', help: 'Single rate for the mock', type: 'number', step: 0.25, section: PAY },
  { key: 'mileage', label: 'Mileage rate ($/mi)', help: 'Reimbursed miles only', type: 'number', step: 0.01, section: PAY },
  { key: 'speed', label: 'Average drive speed (km/h)', help: 'Town driving incl. lights', type: 'number', section: TRAVEL },
  { key: 'road', label: 'Road factor', help: 'Straight-line → road distance', type: 'number', step: 0.05, section: TRAVEL },
];

export const payLaborRulesEngine: EngineFeature = {
  id: 'pay-labor-rules',
  title: 'Pay & labor rules',
  description: 'Labor standards, paid-time rules, wage and mileage used for every hour and cost figure.',
  requirements: ['BR-007', 'BR-012', 'BR-024'],
  defaultOn: true,
  locked: true,
  settings,
};
