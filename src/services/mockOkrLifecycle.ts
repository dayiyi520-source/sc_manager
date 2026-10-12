import { goalLevel } from './okrGoalRules';
import { lockGoalPlan, planChanged, validateThreeLevelGoal, sourceKeyResults } from './okrThreeLevelRules';
import type { OkrPayload, OkrPerson, OkrRecord, OkrGoalChange } from './okrRepository';

interface Mutation { action?: string; kind?: string; viewerId?: string; version?: number; periodKey?: string; submit?: boolean; payload?: OkrPayload; feedback?: string; suggestedSource?: string; }
interface Result { records: OkrRecord[]; value: unknown }
const timestamp = () => new Date().toISOString();
function verifySource(payload: OkrPayload, records: OkrRecord[], person: OkrPerson, period: string) {
  if (payload.goalLevel === 'company') return;
  if (payload.origin === 'autonomous') {
    if (!payload.sourceObjectiveId) return;
    const source = records.find(item => item.id === payload.sourceObjectiveId && item.periodKey === period && item.ownerId === person.supervisorId && ['active','reviewed'].includes(item.status));
    if (!source || (source.changeRequest?.purpose === 'initial' && source.changeRequest.status !== 'approved') || (payload.sourceKrId && !sourceKeyResults(source).some(kr => kr.id === payload.sourceKrId))) throw new Error('只能对齐当前周期直属上级的已生效 O 或 KR');
    if (source.version !== payload.sourceVersion) throw new Error('关联来源已更新，请核对后重新选择');
    return;
  }
  const source = records.find(record => record.id === payload.sourceObjectiveId && record.periodKey === period && ['active', 'reviewed'].includes(record.status));
  const kr = source && sourceKeyResults(source).find(item => item.id === payload.sourceKrId);
  if (!source || (source.changeRequest?.purpose === 'initial' && source.changeRequest.status !== 'approved') || source.ownerId !== person.supervisorId || !kr?.assigneeIds?.includes(person.id)) throw new Error('上级关键结果已撤回或不再指派给本人，请刷新');
  if (payload.deadline && kr.deadline && payload.deadline > kr.deadline) throw new Error('部门计划截止日期不能超过上级 KR 原计划');
  if (payload.sourceVersion !== source.version) throw new Error('上级目标已更新，请先确认同步再提交');
  if (payload.goalLevel === 'personal' && (payload.title !== kr.title || payload.keyResults?.length !== 1 || payload.keyResults[0].id !== kr.id || payload.keyResults[0].title !== kr.title || (!payload.keyResults[0].plannedDeadline && payload.keyResults[0].deadline !== kr.deadline) || payload.keyResults[0].weight !== 100 || payload.keyResults[0].businessObject !== kr.businessObject || payload.keyResults[0].stage !== kr.stage || payload.keyResults[0].version !== kr.version || payload.keyResults[0].progress !== 0 || payload.keyResults[0].structureType !== kr.structureType || payload.keyResults[0].action !== kr.action || payload.keyResults[0].result !== kr.result || (!payload.plannedDeadline && payload.deadline !== kr.deadline))) throw new Error('个人只能填写本人 A，不能修改上级 KR');
}
export function mutateOkrLifecycle(recordId: string | undefined, body: Mutation, records: OkrRecord[], people: OkrPerson[]): Result | undefined {
  const record = records.find(item => item.id === recordId);
  const lifecycleAction = ['approve-change', 'return-change', 'acknowledge-source', 'withdraw-change'].includes(body.action || '');
  if (!lifecycleAction && body.payload?.goalModelVersion !== 2 && record?.payload.goalModelVersion !== 2) return undefined;
  if (record?.kind === 'review' || body.kind === 'review') return undefined;
  const person = people.find(item => item.id === body.viewerId);
  if (!person) throw new Error('当前用户无目标操作权限');
  const replace = (next: OkrRecord) => ({ records: records.map(item => item.id === next.id ? next : item), value: next });
  if (recordId) {
    if (!record || record.status === 'deleted') throw new Error('目标不存在或已删除');
    if (record.version !== body.version) throw new Error('目标已被更新，请刷新后重试');
    if (body.action === 'approve-change' || body.action === 'return-change') {
      const change = record.changeRequest;
      if (!change || change.status !== 'pending' || change.reviewerId !== person.id) throw new Error('无权审核此修改申请');
      const owner = people.find(item => item.id === record.ownerId);
      if (!owner || owner.supervisorId !== person.id) throw new Error('组织关系已变化，不能审核');
      if (body.action === 'approve-change') { const validation = validateThreeLevelGoal(change.payload, record.ownerId); if (validation) throw new Error(validation); }
      if (body.action === 'approve-change') verifySource(change.payload, records, owner, record.periodKey);
      if (body.suggestedSource) { const selected = records.find(source => body.suggestedSource?.startsWith(`${source.id}:`) && source.ownerId === person.id && source.periodKey === record.periodKey && ['active','reviewed'].includes(source.status)); if (!selected) throw new Error('建议对齐来源必须是本月已生效目标'); }
      if (body.action === 'return-change' && !body.feedback?.trim()) throw new Error('请填写退回原因');
      const reviewed: OkrGoalChange = { ...change, status: body.action === 'approve-change' ? 'approved' : 'returned', reviewedAt: timestamp(), feedback: body.feedback?.trim(), ...(body.suggestedSource ? { payload: { ...change.payload, reviewerSuggestedSource: body.suggestedSource } } : {}) };
      return replace({ ...record, payload: body.action === 'approve-change' ? lockGoalPlan(change.payload) : record.payload, status: body.action === 'approve-change' && change.purpose === 'initial' ? 'active' : record.status, changeRequest: reviewed, changeHistory: [...(record.changeHistory || []), reviewed], version: record.version + 1 });
    }
    if (record.ownerId !== person.id) throw new Error('只能修改本人目标');
    if (body.action === 'withdraw-change') {
      if (record.changeRequest?.status !== 'pending') throw new Error('没有待审核申请');
      return replace({ ...record, changeRequest: { ...record.changeRequest, status: 'returned', feedback: '申请人撤回', reviewedAt: timestamp() }, version: record.version + 1 });
    }
    if (body.action === 'acknowledge-source') {
      const source = records.find(item => item.id === record.payload.sourceObjectiveId);
      const sourceKr = source && sourceKeyResults(source).find(kr => kr.id === record.payload.sourceKrId);
      if (!source || source.status === 'deleted' || (record.payload.origin !== 'autonomous' && !sourceKr?.assigneeIds?.includes(person.id))) throw new Error('上级指派已撤回，请联系上级');
      const updated = { ...record.payload, sourceVersion: source.version, sourceTitle: sourceKr?.title || source.payload.title,
        ...(record.payload.goalLevel === 'personal' && record.payload.origin !== 'autonomous' && sourceKr ? { title: sourceKr.title, keyResults: [{ ...sourceKr, weight: 100, progress: 0, deadline: record.payload.keyResults?.[0]?.deadline || sourceKr.deadline, plannedDeadline: record.payload.keyResults?.[0]?.plannedDeadline, forecastDeadline: record.payload.keyResults?.[0]?.forecastDeadline, assigneeIds: [person.id], executionActions: record.payload.keyResults?.[0]?.executionActions || [] }] } : {}) };
      verifySource(updated, records, person, record.periodKey);
      return replace({ ...record, payload: updated, version: record.version + 1 });
    }
    if (body.action === 'delete') {
      if (records.some(item => item.status !== 'deleted' && item.payload.sourceObjectiveId === record.id)) throw new Error('目标已有下级承接，不能删除');
      return replace({ ...record, status: 'deleted', version: record.version + 1 });
    }
    if (record.changeRequest?.status === 'pending') throw new Error('已有待审核修改申请，请等待审核或撤回');
    if (!['save', 'submit'].includes(body.action || '')) throw new Error('不支持此目标操作');
  }
  const payload = body.payload || record?.payload;
  if (!payload || payload.goalModelVersion !== 2) throw new Error('目标数据无效');
  const expectedLevel = goalLevel(person) === '公司级' ? 'company' : goalLevel(person) === '主管级' ? 'department' : 'personal';
  if (payload.goalLevel !== expectedLevel) throw new Error('目标层级与本人组织角色不匹配');
  const submission = record ? body.action === 'submit' || !['draft','submitted'].includes(record.status) : body.submit !== false;
  if (submission) { const error = validateThreeLevelGoal(payload, person.id); if (error) throw new Error(error); }
  verifySource(payload, records, person, record?.periodKey || body.periodKey || '');
  if (record && !['draft','submitted'].includes(record.status) && record.payload.goalModelVersion === 2 && (planChanged(record.payload, payload) || payload.plannedDeadline !== record.payload.plannedDeadline || record.payload.keyResults?.some(kr => { const next = payload.keyResults?.find(item => item.id === kr.id); return next && (next.plannedDeadline !== kr.plannedDeadline || kr.executionActions?.some(action => { const changed = next.executionActions?.find(item => item.id === action.id); return changed && changed.plannedDeadline !== action.plannedDeadline; })); }))) throw new Error('原计划日期已锁定，请调整预计完成日期并说明原因');
  if (record && record.payload.goalModelVersion === 2 && records.some(child => child.status !== 'deleted' && child.payload.sourceObjectiveId === record.id && !payload.keyResults?.some(kr => kr.id === child.payload.sourceKrId))) throw new Error('已有下级承接的 KR 不能移除，请先处理承接关系');
  if (payload.sourceKrId && records.some(item => item.id !== record?.id && item.status !== 'deleted' && item.kind === 'objective' && item.ownerId === person.id && item.periodKey === (record?.periodKey || body.periodKey) && (item.payload.sourceKrId === payload.sourceKrId || (item.changeRequest?.status === 'pending' && item.changeRequest.payload.sourceKrId === payload.sourceKrId)))) throw new Error('该指派已承接或正在关联确认，请继续编辑已有目标');
  if (record && !['draft','submitted'].includes(record.status) && expectedLevel !== 'company') {
    if (!payload.changeReason?.trim()) throw new Error('请填写修改原因');
    if (!person.supervisorId) throw new Error('未配置上级审核人');
    const change: OkrGoalChange = { id: crypto.randomUUID(), status: 'pending', purpose: record.payload.sourceKrId !== payload.sourceKrId || record.payload.sourceObjectiveId !== payload.sourceObjectiveId ? 'alignment' : 'update', reason: payload.changeReason.trim(), reviewerId: person.supervisorId, payload: { ...payload, inherited: false }, baseVersion: record.version, requestedAt: timestamp() };
    return replace({ ...record, changeRequest: change, version: record.version + 1 });
  }
  const next: OkrRecord = { ...record, id: record?.id || crypto.randomUUID(), kind: 'objective', ownerId: person.id, periodKey: record?.periodKey || body.periodKey || '', status: submission ? 'active' : 'draft', createdAt: record?.createdAt || timestamp(), version: (record?.version ?? -1) + 1, payload: submission ? lockGoalPlan(payload) : { ...payload, inherited: false } };
  if (record && !['draft','submitted'].includes(record.status)) next.payload = { ...payload, plannedDeadline: record.payload.plannedDeadline || record.payload.deadline, inherited: false };
  if (record && record.status !== 'draft' && expectedLevel === 'company') { next.changeHistory = [...(record.changeHistory || []), { id: crypto.randomUUID(), status: 'approved', reviewerId: person.id, reason: payload.changeReason || '公司目标调整', payload: next.payload, baseVersion: record.version, requestedAt: timestamp(), reviewedAt: timestamp() }]; }
  if (submission && payload.origin === 'autonomous' && expectedLevel !== 'company' && (!record || ['draft','submitted'].includes(record.status))) {
    if (!person.supervisorId) throw new Error('未配置上级审核人，不能提交');
    next.status = 'submitted'; next.payload = { ...payload, inherited: false };
    next.changeRequest = { id: crypto.randomUUID(), status: 'pending', purpose: 'initial', reviewerId: person.supervisorId, reason: '自主目标首次提交', payload: { ...payload, inherited: false }, baseVersion: next.version, requestedAt: timestamp() };
  }
  return record ? replace(next) : { records: [...records, next], value: { id: next.id } };
}
