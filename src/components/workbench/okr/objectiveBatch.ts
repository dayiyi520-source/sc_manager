import type { ObjectiveFormHandle } from './ObjectiveForm';

export interface ObjectiveBatchResult {
  completedIds: string[];
  failedId?: string;
}

export async function runObjectiveBatch(
  formIds: string[],
  refs: Record<string, ObjectiveFormHandle | null>,
  action: keyof ObjectiveFormHandle,
): Promise<ObjectiveBatchResult> {
  const completedIds: string[] = [];

  for (const formId of formIds) {
    const form = refs[formId];
    if (!form || !(await form[action]())) return { completedIds, failedId: formId };
    completedIds.push(formId);
  }

  return { completedIds };
}
