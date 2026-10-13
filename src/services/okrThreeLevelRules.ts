import { krDetailContentComplete, krDetailsError, krDetails } from './okrKrDetails';
import { goalLevel } from './okrGoalRules';
import type { OkrKr, OkrPayload, OkrPerson, OkrRecord, GoalTiming } from './okrRepository';

export function sourceKeyResults(record: OkrRecord): OkrKr[] {
  if (record.kind === 'objective') return record.payload.keyResults || [];
  if (record.kind !== 'action') return [];
  return [{ id: record.id, title: record.payload.title, weight: Number(record.payload.weight || 100), progress: Number(record.payload.progress || 0), deadline: record.payload.deadline, assigneeIds: record.payload.assigneeIds, businessObject: record.payload.businessObject || record.payload.productLine, version: undefined, stage: record.payload.milestone, action: record.payload.title, result: record.payload.acceptanceStandard }];
}
export function assignedReferences(records: OkrRecord[], person?: OkrPerson): OkrRecord[] {
  if (!person?.supervisorId) return [];
  const refs = records.filter(record => ['objective', 'action'].includes(record.kind) && record.ownerId === person.supervisorId && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved') && ['active', 'submitted', 'reviewed'].includes(record.status)).flatMap(record => sourceKeyResults(record).filter(kr => kr.assigneeIds?.includes(person.id)).map(kr => ({
    ...record, id: kr.id, kind: 'action' as const,
    payload: { ...kr, sourceKrData: kr, version: undefined, title: kr.title, parentObjectiveId: record.id, parentKeyResultId: kr.id, parentActionId: kr.id, sourceObjectiveId: record.id, sourceKrId: kr.id, sourceVersion: record.version, sourceTitle: kr.title },
  })));
  return [...new Map(refs.map(ref => [`${ref.periodKey}:${ref.payload.sourceObjectiveId}:${ref.id}`, ref])).values()];
}
export function upstreamReadiness(records: OkrRecord[], person: OkrPerson | undefined, period: string): string {
  if (!person?.supervisorId) return '未配置直属上级，请先完善组织关系';
  if (assignedReferences(records, person).some(ref => ref.periodKey === period)) return '已有指派给你的 KR，可承接或自主新增';
  const source = records.filter(record => record.ownerId === person.supervisorId && record.periodKey === period && record.kind !== 'review' && record.status !== 'deleted');
  return source.some(record => ['active','reviewed'].includes(record.status)) ? '上级目标已生效，当前没有指派给你的 KR，可自主提出目标' : '上级本月目标尚未生效，可先制定自主目标';
}
export function autonomousGoalPayload(person: OkrPerson): OkrPayload {
  return { goalModelVersion: 2, goalLevel: goalLevel(person) === '个人级' ? 'personal' : 'department', origin: 'autonomous', title: '', objectiveType: 'challenge', weight: 100, keyResults: [] };
}
export function inheritedGoalPayload(reference: OkrRecord, person: OkrPerson): OkrPayload {
  const personal = goalLevel(person) === '个人级';
  return { goalModelVersion: 2, goalLevel: personal ? 'personal' : 'department', origin: 'assigned', inherited: true,
    title: personal ? reference.payload.title : '', sourceTitle: reference.payload.title,
    sourceObjectiveId: reference.payload.sourceObjectiveId || reference.payload.parentObjectiveId,
    sourceKrId: reference.payload.sourceKrId || reference.id, sourceVersion: reference.version,
    alignments: [{ parentObjectiveId: reference.payload.sourceObjectiveId || reference.payload.parentObjectiveId || '', parentKeyResultId: reference.id }],
    weight: 100, deadline: reference.payload.deadline,
    keyResults: personal ? [{ ...(reference.payload.sourceKrData || reference.payload), id: reference.id, title: reference.payload.title, weight: 100, progress: 0, version: reference.payload.sourceKrData?.version, assigneeIds: [person.id], executionActions: [] } as OkrKr] : [],
  };
}
export function goalsWithAssignments(records: OkrRecord[], _person?: OkrPerson): OkrRecord[] {
  return records;
}
export function timingError(timing: GoalTiming): string | undefined {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if ([timing.deadline, timing.forecastDeadline, timing.actualStartedAt, timing.actualCompletedAt].some(value => value && !validDate(value))) return '日期格式或日期值无效';
  if (timing.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(timing.deadline)) return '原计划日期无效';
  if (timing.forecastDeadline && !/^\d{4}-\d{2}-\d{2}$/.test(timing.forecastDeadline)) return '预计完成日期无效';
  if (timing.forecastDeadline && timing.deadline && timing.forecastDeadline > timing.deadline && !timing.delayReason?.trim()) return '预计完成超过原计划时请填写延期原因';
  if (timing.actualStartedAt && timing.actualStartedAt > new Date().toISOString().slice(0, 10)) return '实际开始日期不能是未来日期';
  if (timing.actualCompletedAt && timing.actualCompletedAt > new Date().toISOString().slice(0, 10)) return '实际完成日期不能是未来日期';
  if (timing.actualStartedAt && timing.actualCompletedAt && timing.actualStartedAt > timing.actualCompletedAt) return '实际完成日期不能早于实际开始日期';
}
export function validateThreeLevelGoal(payload: OkrPayload, ownerId: string): string | undefined {
  if (payload.title?.length > 255) return '目标名称不能超过 255 个字符';
  if (!payload.title?.trim()) return '请填写带指标的目标名称';
  if (!Number.isInteger(payload.weight ?? 100) || (payload.weight ?? 100) < 1 || (payload.weight ?? 100) > 100) return '目标权重须为 1–100 的整数';
  if (new Set(payload.keyResults?.map(kr => kr.id)).size !== (payload.keyResults || []).length) return 'KR 编号不能重复';
  if (!payload.keyResults?.length) return '请至少填写一条关键结果';
  if (payload.goalLevel !== 'company' && payload.origin !== 'autonomous' && (!payload.sourceObjectiveId || !payload.sourceKrId)) return '请先承接指派给本人的关键结果';
  if (payload.keyResults.reduce((sum, kr) => sum + kr.weight, 0) !== 100) return 'KR 权重合计须为 100%';
  if (!payload.keyResults.some(kr => kr.weight > 20)) return '至少一条 KR 权重须大于 20%';
  for (const kr of payload.keyResults) {
    if (!Number.isInteger(kr.progress) || kr.progress < 0 || kr.progress > 100) return 'KR 进度须为 0–100 的整数';
    if (!kr.title?.trim()) return '请填写每条关键结果名称';
    if (!Number.isInteger(kr.weight) || kr.weight < 5 || kr.weight > 100 || kr.weight % 5 !== 0) return 'KR 权重须为 5% 的倍数';
    if (payload.deadline && kr.deadline && kr.deadline > payload.deadline) return 'KR 计划截止日期不能超过目标原计划';
    if (!kr.deadline) return '请设置每条 KR 的计划截止日期';
    if (payload.goalLevel === 'department') {
      if (!['product', 'delivery', 'support'].includes(kr.structureType || '')) return '请选择 KR 业务类型';
      if (!kr.businessObject || (kr.structureType === 'support' ? !kr.action || !kr.result : !krDetailContentComplete(kr))) return '请填写完整 KR 业务字段';
    }
    const detailError = krDetailsError(kr); if (detailError) return detailError;
    if (payload.goalLevel === 'personal' && !kr.executionActions?.length) return '请填写本人本月执行的 A 动作';
    if ((kr.executionActions || []).length > 20) return '每条 KR 最多填写 20 条本人动作';
    if (new Set((kr.executionActions || []).map(action => action.id)).size !== (kr.executionActions || []).length) return '本人动作编号不能重复';
    if (kr.executionActions?.some(action => action.weight !== undefined) && (kr.executionActions || []).reduce((sum, action) => sum + (action.weight ?? 0), 0) !== 100) return '本人 A 权重合计须为 100%';
    for (const action of kr.executionActions || []) {
      if (action.ownerId !== ownerId || !kr.assigneeIds?.includes(ownerId)) return '只能填写指派给本人的 KR 下的 A';
      if (action.weight !== undefined && (!Number.isInteger(action.weight) || action.weight < 1 || action.weight > 100)) return 'A 权重须为 1–100 的整数';
      if (action.progress < 0 || action.progress > 100 || !Number.isInteger(action.progress)) return 'A 进度须为 0–100 的整数';
      if (action.title?.length > 1000) return 'A 动作内容不能超过 1000 个字符';
      if (!action.title?.trim()) return '请填写 A 动作内容';
      if (!action.deadline) return '请设置 A 的计划截止日期';
      if (kr.deadline && action.deadline > kr.deadline) return 'A 计划截止日期不能超过所属 KR';
      const error = timingError(action); if (error) return error;
    }
    const error = timingError(kr); if (error) return error;
  }
  return timingError(payload);
}
export function lockGoalPlan(payload: OkrPayload): OkrPayload {
  return { ...payload, inherited: false, plannedDeadline: payload.plannedDeadline || payload.deadline, keyResults: payload.keyResults?.map(kr => ({ ...kr, plannedDeadline: kr.plannedDeadline || kr.deadline, executionActions: kr.executionActions?.map(action => ({ ...action, plannedDeadline: action.plannedDeadline || action.deadline })) })) };
}
export function planChanged(before: OkrPayload, after: OkrPayload): boolean {
  if (before.deadline !== after.deadline) return true;
  return (before.keyResults || []).some(kr => {
    const next = after.keyResults?.find(item => item.id === kr.id);
    return !!next && (next.deadline !== kr.deadline || krDetails(kr).some(row => { const changed = krDetails(next).find(item => item.id === row.id); return !!changed && (Boolean(row.plannedStartDate) && changed.plannedStartDate !== row.plannedStartDate || Boolean(row.plannedEndDate) && changed.plannedEndDate !== row.plannedEndDate); }) || (kr.executionActions || []).some(action => { const changed = next.executionActions?.find(item => item.id === action.id); return !!changed && changed.deadline !== action.deadline; }));
  });
}
