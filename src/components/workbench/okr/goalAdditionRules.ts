import type { OkrPayload, OkrKr } from '../../../services/okrRepository';

export const GOAL_ADDITION_MESSAGE = '请先填写当前已添加的O/KR/A的内容后再继续';
export function krContentComplete(kr: OkrKr, level?: OkrPayload['goalLevel']): boolean {
  if (level === 'department') return Boolean(kr.businessObject?.trim() && (kr.structureType === 'support' ? kr.action?.trim() && kr.result?.trim() : kr.version?.trim() && kr.stage?.trim()));
  return Boolean(kr.title?.trim());
}
export function goalContentComplete(payload: OkrPayload): boolean {
  return Boolean(payload.title?.trim() && payload.keyResults?.length && payload.keyResults.every(kr => krContentComplete(kr, payload.goalLevel) && (kr.executionActions || []).every(action => Boolean(action.title?.trim()))));
}
