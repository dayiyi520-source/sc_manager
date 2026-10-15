import type { CurrentUser, OKRItem } from '../types';
import type { OkrRecord } from './okrRepository';

type WorkbenchGoalLevel = 'company' | 'department' | 'personal';

function viewerGoalLevel(viewer: CurrentUser): WorkbenchGoalLevel {
  if (viewer.role === 'admin') return 'company';
  if (viewer.roleTitle.includes('主管')) return 'department';
  return 'personal';
}

export function workbenchGoalTargets(records: OkrRecord[], viewer: CurrentUser): OKRItem[] {
  const currentCycle = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const effective = records.filter(row => row.kind === 'objective' && row.periodKey === currentCycle && ['active', 'reviewed', 'completed'].includes(row.status) && !row.payload.inherited);
  const level = viewerGoalLevel(viewer);
  const personal = effective.filter(row => row.ownerId === viewer.id && row.payload.goalLevel === 'personal');
  const map = (record: OkrRecord, title: string, krs: OKRItem['keyResults'], primaryLabel: 'O' | 'KR'): OKRItem => ({
    id: record.id, ownerId: viewer.id, ownerName: viewer.name, department: viewer.department, category: 'my',
    cycle: record.periodKey, objective: title, weight: record.payload.weight ?? 100, deadline: record.payload.deadline || record.periodKey,
    progress: krs.length ? Math.round(krs.reduce((sum, row) => sum + row.progress * row.weight, 0) / (krs.reduce((sum, row) => sum + row.weight, 0) || 1) * 10) / 10 : 0,
    primaryLabel, keyResults: krs,
  });
  const results = personal.map(record => {
    const source = effective.find(row => row.id === record.payload.sourceObjectiveId);
    const kr = source?.payload.keyResults?.find(row => row.id === record.payload.sourceKrId);
    const actions = (record.payload.keyResults || []).flatMap(row => (row.executionActions || []).filter(action => action.ownerId === viewer.id).map(action => ({
      id: action.id, content: action.title, weight: action.weight ?? 100, progress: action.progress, deadline: action.deadline || record.payload.deadline || record.periodKey,
    })));
    return map(record, kr?.title || record.payload.sourceTitle || record.payload.title, actions, 'KR');
  });

  if (level === 'company' || level === 'department') {
    return effective
      .filter(record => record.ownerId === viewer.id && record.payload.goalLevel === level)
      .map(record => map(record, record.payload.title, (record.payload.keyResults || []).map(kr => ({
        id: kr.id, content: kr.title, weight: kr.weight, progress: kr.progress, deadline: kr.deadline || record.periodKey,
        executionActions: kr.executionActions,
      })), 'O'));
  }

  for (const record of effective) {
    if (record.payload.goalLevel === 'personal') continue;
    const ownKrs = (record.payload.keyResults || []).filter(kr => kr.assigneeIds?.includes(viewer.id));
    for (const kr of ownKrs) {
      if (personal.some(row => row.payload.sourceObjectiveId === record.id && row.payload.sourceKrId === kr.id)) continue;
      const actions = (kr.executionActions || []).filter(action => action.ownerId === viewer.id).map(action => ({ id: action.id, content: action.title, weight: action.weight ?? 100, progress: action.progress, deadline: action.deadline || kr.deadline || record.periodKey }));
      results.push(map({ ...record, id: `${record.id}:${kr.id}` }, kr.title, actions, 'KR'));
    }
    if (!ownKrs.length && record.ownerId === viewer.id && record.payload.goalLevel !== 'department') results.push(map(record, record.payload.title, (record.payload.keyResults || []).map(kr => ({ id: kr.id, content: kr.title, weight: kr.weight, progress: kr.progress, deadline: kr.deadline || record.periodKey })), 'O'));
  }
  return results;
}
