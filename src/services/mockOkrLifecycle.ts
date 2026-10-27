import { creationPeriodError, isDepartmentTemplateAvailable } from './goalCreationPolicy';
import { normalizeGoalAssignments, assignedDetailRows, isAssigneeOnlyDepartmentChange } from './okrAssignments';
import { normalizeObjectiveTitleTemplates } from './okrObjectiveTitleTemplates';
import { restoreReturnedInitialDraft } from './okrSubmissionState';
import { applyProgress, canUpdateProgress, progressSubject } from './okrProgress';
import { canAlignPeriod } from './okrPeriods';
import { canEditOkr, confirmationReviewer, effectiveReviewer, hasOkrPermission } from './okrSettingsPolicy';
import { goalLevel, autonomousAlignmentSource } from './okrGoalRules';
import { lockGoalPlan, validateThreeLevelGoal, sourceKeyResults } from './okrThreeLevelRules';
import type { OkrPayload, OkrPerson, OkrRecord, OkrGoalChange, OkrSettings } from './okrRepository';

interface Mutation { action?: string; kind?: string; viewerId?: string; version?: number; periodKey?: string; submit?: boolean; payload?: OkrPayload; feedback?: string; suggestedSource?: string; itemId?: string; progress?: number; progressStatus?: 'normal' | 'risk' | 'overdue' | 'ahead'; note?: string; attachments?: Array<{ name: string; data: string }>; }
interface Result { records: OkrRecord[]; value: unknown }
const timestamp = () => new Date().toISOString();
function verifySource(payload: OkrPayload, records: OkrRecord[], person: OkrPerson, period: string, settings?: OkrSettings, people: OkrPerson[] = []) {
  if (payload.goalLevel === 'company') return;
  if (payload.origin === 'autonomous') {
    if (!payload.sourceObjectiveId) return;
    const source = records.find(item => item.id === payload.sourceObjectiveId && canAlignPeriod(period,item.periodKey,settings?.cycles?.crossAlignment) && autonomousAlignmentSource(item, person, payload.goalLevel === 'personal', people) && ['active','reviewed'].includes(item.status));
    if (!source || (source.changeRequest?.purpose === 'initial' && source.changeRequest.status !== 'approved') || (payload.sourceKrId && !sourceKeyResults(source).some(kr => kr.id === payload.sourceKrId))) throw new Error(payload.goalLevel === 'personal' && goalLevel(person) === '部门级' ? '只能对齐本部门主管已生效的部门 O 或 KR' : '只能对齐同周期或包含当前周期的直属上级已生效 O 或 KR');
    const deadline = (payload.sourceKrId ? sourceKeyResults(source).find(kr => kr.id === payload.sourceKrId)?.deadline : undefined) || source.payload.deadline;
    if (deadline && (payload.deadline && payload.deadline > deadline || payload.keyResults?.some(kr => kr.deadline && kr.deadline > deadline || kr.executionActions?.some(action => action.deadline && action.deadline > deadline)))) throw new Error('下级计划截止日期不能超过上级截止日期');
    if (source.version !== payload.sourceVersion) throw new Error('关联来源已更新，请核对后重新选择');
    return;
  }
  const source = records.find(record => record.id === payload.sourceObjectiveId && canAlignPeriod(period,record.periodKey,settings?.cycles?.crossAlignment) && ['active', 'reviewed'].includes(record.status));
  const kr = source && sourceKeyResults(source).find(item => item.id === payload.sourceKrId);
  const supervisorOwnDepartmentSource = goalLevel(person) === '部门级' && source?.ownerId === person.id && source.payload.goalLevel === 'department';
  if (!source || (source.changeRequest?.purpose === 'initial' && source.changeRequest.status !== 'approved') || (!supervisorOwnDepartmentSource && source.ownerId !== person.supervisorId) || !kr?.assigneeIds?.includes(person.id)) throw new Error('上级关键结果已撤回或不再指派给本人，请刷新');
  if (kr.deadline && (payload.deadline && payload.deadline > kr.deadline || payload.keyResults?.some(item => item.deadline && item.deadline > kr.deadline! || item.executionActions?.some(action => action.deadline && action.deadline > kr.deadline!)))) throw new Error('部门计划截止日期不能超过上级 KR 原计划');
  if (payload.sourceVersion !== source.version) throw new Error('上级目标已更新，请先确认同步再提交');
  if (payload.goalLevel === 'personal' && (payload.title !== kr.title || payload.keyResults?.length !== 1 || payload.keyResults[0].id !== kr.id || payload.keyResults[0].title !== kr.title || (!payload.keyResults[0].plannedDeadline && payload.keyResults[0].deadline !== kr.deadline) || payload.keyResults[0].weight !== 100 || payload.keyResults[0].businessObject !== kr.businessObject || payload.keyResults[0].stage !== kr.stage || payload.keyResults[0].version !== kr.version || JSON.stringify(payload.keyResults[0].details) !== JSON.stringify(assignedDetailRows(kr, person.id)) || payload.keyResults[0].progress !== 0 || payload.keyResults[0].structureType !== kr.structureType || payload.keyResults[0].action !== kr.action || payload.keyResults[0].result !== kr.result || (!payload.plannedDeadline && payload.deadline !== kr.deadline))) throw new Error('个人只能填写本人 A，不能修改上级 KR');
}
export function mutateOkrLifecycle(recordId: string | undefined, body: Mutation, records: OkrRecord[], people: OkrPerson[], settings?: OkrSettings): Result | undefined {
  if (body.payload && body.kind !== 'review') {
    body = { ...body, payload: normalizeGoalAssignments(body.payload) };
    const payload = body.payload!;
    if (!recordId && payload.goalLevel === 'personal') throw new Error('个人月度目标由部门指派，无需自行添加');
    if (!recordId && payload.goalModelVersion === 2) {
      const owner = people.find(person => person.id === body.viewerId);
      if (owner) { const unavailable = payload.goalLevel === 'company' ? undefined : creationPeriodError(records, owner, payload.goalLevel === 'department' ? 'department' : 'personal', people, body.periodKey || '',settings); if (unavailable) throw new Error(unavailable); }
    }
    if (payload.goalLevel === 'department' && (payload.objectiveTitleTemplateId || !recordId && payload.objectiveType !== 'challenge') && settings) {
      const owner = people.find(person => person.id === body.viewerId);
      const template = normalizeObjectiveTitleTemplates(settings).find(row => row.id === payload.objectiveTitleTemplateId && row.enabled && row.department === owner?.department);
      if (!template || payload.title !== template.title || payload.objectiveType !== 'target' || payload.keyResults?.some(kr => !template.krTypes?.includes(kr.structureType!))) throw new Error('部门 O 须使用启用模板的标题、承诺类型及支持的 KR 类型');
    }
    for (const kr of payload.keyResults || []) for (const id of [...(kr.assigneeIds || []), ...(kr.details || []).flatMap(row => row.assigneeIds || [])]) {
      const member = people.find(person => person.id === id);
      const owner = people.find(person => person.id === body.viewerId);
      if (!member || payload.goalLevel === 'department' && member.department !== owner?.department) throw new Error('承接人不在当前部门');
    }
  }
  const record = records.find(item => item.id === recordId);
  const normalized = record && restoreReturnedInitialDraft(record);
  if (record && normalized !== record) return mutateOkrLifecycle(recordId, body, records.map(item => item.id === recordId ? normalized! : item), people, settings);
  const lifecycleAction = ['approve-change', 'return-change', 'acknowledge-source', 'withdraw-change', 'update-progress'].includes(body.action || '');
  if (!lifecycleAction && body.payload?.goalModelVersion !== 2 && record?.payload.goalModelVersion !== 2) return undefined;
  if (record?.kind === 'review' || body.kind === 'review') return undefined;
  const person = people.find(item => item.id === body.viewerId);
  if (!person) throw new Error('当前用户无目标操作权限');
  const replace = (next: OkrRecord) => ({ records: records.map(item => item.id === next.id ? next : item), value: next });
  if (recordId) {
    if (!record || record.status === 'deleted') throw new Error('目标不存在或已删除');
    if (['approve-change','return-change'].includes(body.action || '') && record.changeRequest?.status === 'pending' && effectiveReviewer(record,settings,people) !== person.id) throw new Error('组织关系或确认配置已变化，不能审核');
    if (record.version !== body.version) throw new Error('目标已被更新，请刷新后重试');
    if (body.action === 'update-progress') {
      if (!body.itemId || !canUpdateProgress(record, body.itemId, person.id, records)) throw new Error('此进度只能查看历史，不能直接更新');
      if (!Number.isInteger(body.progress) || body.progress! < 0 || body.progress! > 100 || !body.note?.trim() || body.note.length > 2000 || !['normal', 'risk', 'overdue', 'ahead'].includes(body.progressStatus || '')) throw new Error('请填写有效进度、状态和更新说明');
      const attachments = body.attachments || [];
      if (attachments.length > 3 || attachments.some(file => !file.name || !/^data:[^,]*;base64,/.test(file.data)) || attachments.reduce((sum, file) => sum + file.data.length, 0) > 1400000) throw new Error('附件最多 3 个，总大小不能超过 1MB');
      return replace(applyProgress(record, { id: crypto.randomUUID(), itemId: body.itemId, operatorId: person.id, createdAt: timestamp(), previousProgress: progressSubject(record, body.itemId)!.progress, progress: body.progress!, status: body.progressStatus!, note: body.note.trim(), attachments }));
    }
    if (body.action === 'approve-change' || body.action === 'return-change') {
      const change = record.changeRequest;
      if (!change || change.status !== 'pending') throw new Error('无权审核此修改申请');
      if (effectiveReviewer(record,settings,people) !== person.id) throw new Error('组织关系或确认配置已变化，不能审核');
      const owner = people.find(item => item.id === record.ownerId);
      if (!owner || confirmationReviewer(owner, change.purpose === 'delete' ? 'delete' : change.purpose === 'initial' ? 'create' : 'update', change.payload, settings, people) !== person.id) throw new Error('组织关系或确认配置已变化，不能审核');
      if (body.action === 'approve-change' && change.purpose !== 'delete' && change.payload.goalModelVersion === 2) { const validation = validateThreeLevelGoal(change.payload, record.ownerId); if (validation) throw new Error(validation); }
      if (body.action === 'approve-change' && change.purpose !== 'delete' && change.payload.goalModelVersion === 2) verifySource(change.payload, records, owner!, record.periodKey, settings, people);
      if (body.action === 'approve-change' && change.purpose === 'delete' && records.some(child=>child.status !== 'deleted' && child.payload.sourceObjectiveId===record.id)) throw new Error('目标已有下级承接，不能删除');
      if (body.suggestedSource) { const selected = records.find(source => body.suggestedSource?.startsWith(`${source.id}:`) && source.ownerId === person.id && source.periodKey === record.periodKey && ['active','reviewed'].includes(source.status)); if (!selected) throw new Error('建议对齐来源必须是本月已生效目标'); }
      if (body.action === 'return-change' && !body.feedback?.trim()) throw new Error('请填写退回原因');
      const reviewed: OkrGoalChange = { ...change, previousPayload: change.previousPayload || (change.purpose === 'initial' ? undefined : record.payload), status: body.action === 'approve-change' ? 'approved' : 'returned', reviewedAt: timestamp(), feedback: body.feedback?.trim(), ...(body.suggestedSource ? { payload: { ...change.payload, reviewerSuggestedSource: body.suggestedSource } } : {}) };
      return replace({ ...record, payload: body.action === 'return-change' && change.purpose === 'initial' ? change.payload : body.action === 'approve-change' && change.purpose !== 'delete' ? change.payload.goalModelVersion === 2 ? lockGoalPlan(change.payload) : change.payload : record.payload, status: body.action === 'return-change' && change.purpose === 'initial' ? 'draft' : body.action === 'approve-change' && change.purpose === 'delete' ? 'deleted' : body.action === 'approve-change' && change.purpose === 'initial' ? 'active' : record.status, changeRequest: reviewed, changeHistory: [...(record.changeHistory || []), reviewed], version: record.version + 1 });
    }
    if (body.action === 'acknowledge-source' ? record.ownerId !== person.id : !canEditOkr(record,person.id,settings,people)) throw new Error('只能修改本人目标或已授权的公司级目标');
    if (body.action === 'withdraw-change') {
      if (record.changeRequest?.status !== 'pending') throw new Error('没有待审核申请');
      if (record.ownerId !== person.id) throw new Error('仅申请人可撤回确认流程');
      const change = record.changeRequest;
      const withdrawn: OkrGoalChange = { ...change, status: 'returned', feedback: '申请人撤回', reviewedAt: timestamp() };
      return replace({ ...record, status: change.purpose === 'initial' ? 'draft' : record.status, payload: change.purpose === 'initial' ? change.payload : record.payload, changeRequest: undefined, changeHistory: [...(record.changeHistory || []), withdrawn], version: record.version + 1 });
    }
    if (body.action === 'acknowledge-source') {
      const source = records.find(item => item.id === record.payload.sourceObjectiveId);
      const sourceKr = source && sourceKeyResults(source).find(kr => kr.id === record.payload.sourceKrId);
      if (!source || source.status === 'deleted' || (record.payload.origin !== 'autonomous' && !sourceKr?.assigneeIds?.includes(person.id))) {
        return replace({ ...record, payload: { ...record.payload, sourceObjectiveId: undefined, sourceKrId: undefined, sourceVersion: undefined, sourceTitle: undefined, sourceWithdrawalAcknowledged: true }, version: record.version + 1 });
      }
      const updated = { ...record.payload, sourceWithdrawalAcknowledged: false, sourceVersion: source.version, sourceTitle: sourceKr?.title || source.payload.title, sourceKrData: sourceKr,
        ...(record.payload.goalLevel === 'personal' && record.payload.origin !== 'autonomous' && sourceKr ? { title: sourceKr.title, keyResults: [{ ...sourceKr, details: assignedDetailRows(sourceKr, person.id), weight: 100, progress: 0, deadline: record.payload.keyResults?.[0]?.deadline || sourceKr.deadline, plannedDeadline: record.payload.keyResults?.[0]?.plannedDeadline, forecastDeadline: record.payload.keyResults?.[0]?.forecastDeadline, assigneeIds: [person.id], executionActions: record.payload.keyResults?.[0]?.executionActions || [] }] } : {}) };
      return replace({ ...record, payload: updated, version: record.version + 1 });
    }
    if (body.action === 'delete') {
      if (record.changeRequest?.status === 'pending') throw new Error('已有待确认申请，请等待确认或撤回');
      if (records.some(item => item.status !== 'deleted' && item.payload.sourceObjectiveId === record.id)) throw new Error('目标已有下级承接，不能删除');
      const owner = people.find(p=>p.id===record.ownerId)!;
      const reviewerId = ['draft','submitted'].includes(record.status) ? undefined : confirmationReviewer(owner,'delete',record.payload,settings,people);
      if (reviewerId) return replace({...record,changeRequest:{id:crypto.randomUUID(),status:'pending',purpose:'delete',reason:'申请删除目标',reviewerId,payload:record.payload,baseVersion:record.version,requestedAt:timestamp()},version:record.version+1});
      return replace({ ...record, status: 'deleted', version: record.version + 1 });
    }
    if (record.changeRequest?.status === 'pending') throw new Error('已有待审核修改申请，请等待审核或撤回');
    if (!['save', 'submit'].includes(body.action || '')) throw new Error('不支持此目标操作');
  }
  const payload = body.payload || record?.payload;
  if (!payload || payload.goalModelVersion !== 2) throw new Error('目标数据无效');
  const owner = record ? people.find(p=>p.id===record.ownerId)! : person;
  const expectedLevel = goalLevel(owner) === '部门级' ? 'department' : 'personal';
  if (payload.goalLevel === 'company' && !hasOkrPermission(person.id,'companyGoalEdit',settings,people)) throw new Error('无公司级目标权限');
  if (payload.goalLevel !== 'company' && payload.goalLevel !== expectedLevel && !(expectedLevel === 'department' && payload.goalLevel === 'personal' && ['autonomous', 'assigned'].includes(payload.origin || ''))) throw new Error('目标层级与本人组织角色不匹配');
  if (!record) {
    const unavailable = payload.goalLevel === 'company' ? undefined : creationPeriodError(records, owner, payload.goalLevel === 'department' ? 'department' : 'personal', people, body.periodKey || '',settings);
    if (unavailable) throw new Error(unavailable);
    if (payload.goalLevel === 'department' && payload.objectiveTitleTemplateId && !isDepartmentTemplateAvailable(settings, records, owner, body.periodKey || '', payload)) throw new Error('该周期部门 O 模板已占用或不可用，请重新添加目标');
  }
  const submission = record ? body.action === 'submit' || !['draft','submitted'].includes(record.status) : body.submit !== false;
  if (submission) { const error = validateThreeLevelGoal(payload, owner.id); if (error) throw new Error(error); }
  verifySource(payload, records, owner, record?.periodKey || body.periodKey || '', settings, people);
  if (record && !['draft','submitted'].includes(record.status) && (payload.deadline !== record.payload.deadline || record.payload.keyResults?.some(kr => { const next = payload.keyResults?.find(item => item.id === kr.id); return next && next.deadline !== kr.deadline; }))) throw new Error('目标及 KR 原计划日期已锁定');
  if (record && record.payload.goalModelVersion === 2 && records.some(child => child.status !== 'deleted' && child.payload.sourceObjectiveId === record.id && !payload.keyResults?.some(kr => kr.id === child.payload.sourceKrId))) throw new Error('已有下级承接的 KR 不能移除，请先处理承接关系');
  if (payload.sourceKrId && !(payload.goalLevel === 'department' && payload.objectiveType === 'challenge' && !payload.objectiveTitleTemplateId) && records.some(item => item.id !== record?.id && item.status !== 'deleted' && item.kind === 'objective' && item.ownerId === person.id && item.periodKey === (record?.periodKey || body.periodKey) && (payload.goalLevel !== 'department' || !payload.objectiveTitleTemplateId || (item.payload.objectiveTitleTemplateId === payload.objectiveTitleTemplateId && item.payload.sourceObjectiveId === payload.sourceObjectiveId)) && (item.payload.sourceObjectiveId === payload.sourceObjectiveId && item.payload.sourceKrId === payload.sourceKrId || item.changeRequest?.status === 'pending' && item.changeRequest.payload.sourceObjectiveId === payload.sourceObjectiveId && item.changeRequest.payload.sourceKrId === payload.sourceKrId))) throw new Error('该指派已承接或正在关联确认，请继续编辑已有目标');
  const reviewerId = submission ? confirmationReviewer(owner,record && !['draft','submitted'].includes(record.status) ? 'update' : 'create',payload,settings,people) : undefined;
  if (record && !['draft','submitted'].includes(record.status) && reviewerId && !isAssigneeOnlyDepartmentChange(record.payload, payload)) {
    if (!payload.changeReason?.trim()) throw new Error('请填写修改原因');

    const change: OkrGoalChange = { previousPayload: record.payload, id: crypto.randomUUID(), status: 'pending', purpose: record.payload.sourceKrId !== payload.sourceKrId || record.payload.sourceObjectiveId !== payload.sourceObjectiveId ? 'alignment' : 'update', reason: payload.changeReason.trim(), reviewerId, payload: { ...payload, inherited: false }, baseVersion: record.version, requestedAt: timestamp() };
    return replace({ ...record, changeRequest: change, version: record.version + 1 });
  }
  const next: OkrRecord = { ...record, id: record?.id || crypto.randomUUID(), kind: 'objective', ownerId: owner.id, periodKey: record?.periodKey || body.periodKey || '', status: submission ? 'active' : 'draft', createdAt: record?.createdAt || timestamp(), version: (record?.version ?? -1) + 1, payload: submission ? lockGoalPlan(payload) : { ...payload, inherited: false } };
  if (record && !['draft','submitted'].includes(record.status)) next.payload = { ...payload, plannedDeadline: record.payload.plannedDeadline || record.payload.deadline, inherited: false };
  if (record && !['draft','submitted'].includes(record.status)) { next.changeHistory = [...(record.changeHistory || []), { id: crypto.randomUUID(), status: 'approved', previousPayload: record.payload, purpose: 'update', reviewerId: person.id, reason: isAssigneeOnlyDepartmentChange(record.payload, payload) ? '调整承接人员' : payload.changeReason || '目标内容调整', payload: next.payload, baseVersion: record.version, requestedAt: timestamp(), reviewedAt: timestamp() }]; }
  if (submission && reviewerId && (!record || ['draft','submitted'].includes(record.status))) {

    next.status = 'submitted'; next.payload = { ...payload, inherited: false };
    next.changeRequest = { id: crypto.randomUUID(), status: 'pending', purpose: 'initial', reviewerId, reason: '自主目标首次提交', payload: { ...payload, inherited: false }, baseVersion: next.version, requestedAt: timestamp() };
  }
  return record ? replace(next) : { records: [...records, next], value: { id: next.id } };
}
