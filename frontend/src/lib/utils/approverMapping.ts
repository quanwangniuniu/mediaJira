// Helper to map task types to backend ModuleApprover.module values
// Backend choices: ASSET, CAMPAIGN, BUDGET, REPORTING
// Task types: 'budget' | 'asset' | 'retrospective' | 'report'

const TASK_TYPE_TO_MODULE: Record<string, string> = {
  budget: 'BUDGET',
  asset: 'ASSET',
  retrospective: 'CAMPAIGN',
  report: 'REPORTING',
};

/**
 * Map a task type string to the corresponding ModuleApprover.module key.
 * Falls back to upper-casing the type when there is no explicit mapping.
 */
export function mapTaskTypeToModule(taskType?: string | null): string | null {
  if (!taskType) return null;
  const normalized = taskType.toLowerCase();
  return TASK_TYPE_TO_MODULE[normalized] || normalized.toUpperCase();
}

