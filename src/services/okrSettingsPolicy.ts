import { normalizeLegacyReviewTemplates, validateReviewTemplates } from './reviewTemplateConfiguration';
import { validateWeeklyCycles } from './weeklyReviewCycles';
import { normalizeObjectiveTitleTemplates, validateObjectiveTitleTemplates } from './okrObjectiveTitleTemplates';
import type { OkrConfirmationSettings, OkrPerson, OkrRecord, OkrSettings, OkrPermission } from './okrRepository';
import { defaultCycles, materializePeriods } from './okrPeriods';
import { lockGoalPlan } from './okrThreeLevelRules';
export const defaultConfirmation = (): OkrConfirmationSettings => ({ enabled:true,visiblePending:true,actions:['create','update'],types:['target','challenge'],missingSupervisor:'admin',selfSupervisor:'auto',exemptIds:[] });
export const OKR_PERMISSIONS: OkrPermission[] = ['okrTemplates','reviewTemplates','roleSettings','weeklyCycles','confirmationSettings','companyGoalEdit'];
export function normalizedPolicy(settings: OkrSettings, people: OkrPerson[] = []): OkrSettings {
  const administrators = settings.administratorIds ?? people.filter(p => p.rootFlag).map(p => p.id);
  const legacyEditors = settings.confirmation?.companyEditorIds || [];
  const subAdministrators = [...new Set([...(settings.subAdministratorIds || []), ...legacyEditors.filter(id => !administrators.includes(id))])];
  const grants = { ...settings.permissionGrants };
  for (const id of administrators) grants[id] = [...OKR_PERMISSIONS];
  for (const id of settings.subAdministratorIds || []) if (!Object.hasOwn(grants, id)) grants[id] = [];
  for (const id of legacyEditors) if (!Object.hasOwn(grants,id)) grants[id] = ['companyGoalEdit'];
  const confirmation = {...defaultConfirmation(),...settings.confirmation} as OkrConfirmationSettings;
  delete confirmation.companyEditorIds;
  return { ...settings, ...(settings.reviewReportTemplates ? {reviewReportTemplates:normalizeLegacyReviewTemplates(settings.reviewReportTemplates)} : {}), administratorIds: administrators, subAdministratorIds: subAdministrators, permissionGrants: grants, cycles:materializePeriods({...defaultCycles(),...settings.cycles,schedules:{...defaultCycles().schedules,...settings.cycles?.schedules}}), confirmation };
}
export const isOkrAdmin = (viewer: string, settings: OkrSettings | undefined, people: OkrPerson[]) => settings?.administratorIds ? settings.administratorIds.includes(viewer) : !!people.find(p=>p.id===viewer)?.rootFlag;
export const hasOkrPermission = (viewer: string, permission: OkrPermission, settings: OkrSettings | undefined, people: OkrPerson[] = []) => {
  if (!settings) return permission === 'companyGoalEdit' && !!people.find(p=>p.id===viewer)?.rootFlag;
  const policy = normalizedPolicy(settings, people);
  return !!policy.permissionGrants?.[viewer]?.includes(permission);
};
export const canEditOkr = (record: OkrRecord, viewer: string, settings?: OkrSettings, people: OkrPerson[] = []) => {
  const companyGoal = record.payload.goalLevel === 'company' || record.payload.goalModelVersion !== 2 && record.kind === 'objective' && !!people.find(person => person.id === record.ownerId)?.rootFlag;
  return companyGoal ? hasOkrPermission(viewer,'companyGoalEdit',settings,people) : record.ownerId === viewer;
};
export const effectiveReviewer = (record: OkrRecord, settings: OkrSettings | undefined, people: OkrPerson[]) => {
  const change = record.changeRequest;
  const owner = people.find(person => person.id === record.ownerId);
  if (!owner || change?.status !== 'pending') return undefined;
  try { return confirmationReviewer(owner, change.purpose === 'delete' ? 'delete' : change.purpose === 'initial' ? 'create' : 'update', change.payload, settings, people); }
  catch { return undefined; }
};
export const canViewPending = (record: OkrRecord, viewer: string, settings: OkrSettings | undefined, people: OkrPerson[]) => !record.changeRequest || record.changeRequest.status !== 'pending' || settings?.confirmation?.visiblePending !== false || record.ownerId === viewer || effectiveReviewer(record, settings, people) === viewer || isOkrAdmin(viewer, settings, people);
export function reconcileConfirmationRequests(records: OkrRecord[], settings: OkrSettings, people: OkrPerson[]): OkrRecord[] {
  return records.map(record => {
    const change = record.changeRequest;
    if (record.kind !== 'objective' || change?.status !== 'pending') return record;
    const owner = people.find(person => person.id === record.ownerId);
    if (!owner) throw new Error('待确认目标的制定人已失效，请先处理该申请');
    const action = change.purpose === 'delete' ? 'delete' : change.purpose === 'initial' ? 'create' : 'update';
    const reviewerId = confirmationReviewer(owner,action,change.payload,settings,people);
    if (reviewerId) return reviewerId === change.reviewerId ? record : {...record,version:record.version+1,changeRequest:{...change,reviewerId,baseVersion:record.version+1}};
    if (change.purpose === 'delete' && records.some(child => child.status !== 'deleted' && child.payload.sourceObjectiveId === record.id)) throw new Error('目标已有下级承接，无法因确认配置变化自动删除');
    const resolved = {...change,status:'approved' as const,reviewerId:'system',reviewedAt:new Date().toISOString(),feedback:'确认配置变更后自动生效'};
    return {...record,status:change.purpose === 'delete' ? 'deleted' : change.purpose === 'initial' ? 'active' : record.status,payload:change.purpose === 'delete' ? record.payload : lockGoalPlan(change.payload),changeRequest:resolved,changeHistory:[...(record.changeHistory || []),resolved],version:record.version+1};
  });
}
export const canUpdateOkrSettings = (viewer: string, next: OkrSettings, previous: OkrSettings, people: OkrPerson[]) => {
  const groups: Array<[OkrPermission, (keyof OkrSettings)[]]> = [['roleSettings',['administratorIds','subAdministratorIds','supervisorIds','permissionGrants']],['okrTemplates',['templates','objectiveTitleTemplates','dictionaries','validation','timeRules','defaultView']],['reviewTemplates',['reviewReportTemplates']],['weeklyCycles',['weeklyReviewCycles','cycles']],['confirmationSettings',['confirmation']]];
  return groups.every(([permission, fields]) => fields.every(field => JSON.stringify(next[field]) === JSON.stringify(previous[field]) || hasOkrPermission(viewer, permission, previous, people)));
};
export function confirmationReviewer(owner: OkrPerson, action: 'create'|'update'|'delete', payload: OkrRecord['payload'], settings: OkrSettings | undefined, people: OkrPerson[]): string | undefined {
  // Preserve pre-configuration behavior for previously saved projects.
  if (!settings?.confirmation) return owner.rootFlag || action === 'delete' || action === 'create' && payload.origin !== 'autonomous' ? undefined : owner.supervisorId || undefined;
  const policy = settings.confirmation;
  if (!policy.enabled || !policy.actions.includes(action) || !policy.types.includes(payload.objectiveType || 'target') || policy.exemptIds.includes(owner.id) || isOkrAdmin(owner.id,settings,people)) return undefined;
  let supervisor = people.find(p=>p.id===owner.supervisorId);
  if (!supervisor && policy.missingSupervisor === 'upper') { const candidates = people.filter(person => person.id !== owner.id && person.goalRole === 'supervisor' && person.department.trim() === owner.department.trim()); if (candidates.length === 1) supervisor = candidates[0]; }
  if (supervisor && supervisor.id !== owner.id) return supervisor.id;
  const fallback = supervisor?.id === owner.id ? policy.selfSupervisor : policy.missingSupervisor;
  if (fallback === 'auto') return undefined;
  if (fallback === 'upper') {
    const upperId = supervisor?.supervisorId && supervisor.supervisorId !== owner.id ? supervisor.supervisorId : undefined;
    const upper = people.find(person => person.id === upperId && person.id !== owner.id);
    if (upper) return upper.id;
    const fallbackAdministrator = settings.administratorIds?.find(id => id !== owner.id && people.some(person => person.id === id));
    if (fallbackAdministrator) return fallbackAdministrator;
    throw new Error('未找到可用的上级确认人，请配置组织关系或选择管理员确认');
  }
  const administrator = settings.administratorIds?.find(id=>id!==owner.id && people.some(p=>p.id===id));
  if (!administrator) throw new Error('未配置可用的 OKR 管理员');
  return administrator;
}
export function validatePolicy(settings: OkrSettings, people: OkrPerson[], previous?: OkrSettings) {
  if (previous?.administratorIds && (settings.administratorIds?.length !== previous.administratorIds.length || new Set(settings.administratorIds).size !== settings.administratorIds.length)) return '管理员仅支持更换，不可新增或移除';
  const templateError = validateReviewTemplates(settings.reviewReportTemplates || [], previous?.reviewReportTemplates || []);
  if (templateError) return templateError;
  const cycleError = validateWeeklyCycles(settings.weeklyReviewCycles || [], previous?.weeklyReviewCycles || settings.weeklyReviewCycles || []);
  if (cycleError) return cycleError;
  if (settings.supervisorIds?.some(id => !people.some(person => person.id === id))) return '所选主管已失效，请重新选择';
  const titleError = validateObjectiveTitleTemplates(normalizeObjectiveTitleTemplates(settings));
  if (titleError) return titleError;
  const known = new Set(people.map(p=>p.id));
  if (!settings.administratorIds?.length || settings.administratorIds.some(id=>!known.has(id))) return '至少保留一名有效的 OKR 管理员';
  if (settings.subAdministratorIds?.some(id => !known.has(id) || settings.administratorIds?.includes(id))) return '子管理员人员无效或与管理员重复';
  if (Object.entries(settings.permissionGrants || {}).some(([id, grants]) => !known.has(id) || grants.some(grant => !OKR_PERMISSIONS.includes(grant)))) return '权限人员或权限项无效';
  if (!(settings.administratorIds || []).some(id => hasOkrPermission(id,'roleSettings',settings,people)) && !(settings.subAdministratorIds || []).some(id => hasOkrPermission(id,'roleSettings',settings,people))) return '至少保留一名可管理角色的人员';
  if (settings.confirmation && settings.confirmation.exemptIds.some(id=>!known.has(id))) return '所选人员已失效，请重新选择';
  const cycles = settings.cycles;
  if (cycles) {
    if (!cycles.types.length || new Set(cycles.types).size !== cycles.types.length) return '请选择周期类型';
    for (const type of cycles.types) { const schedule = cycles.schedules[type]; if (!schedule || !Number.isInteger(schedule.daysBefore) || schedule.daysBefore<0 || schedule.daysBefore>31 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return '周期创建时间无效'; }
  }
  return undefined;
}

/** Replace a single administrator without changing employee identity or goal ownership. */
export function replaceOkrAdministrator(settings: OkrSettings, people: OkrPerson[], previousId: string, nextId: string): OkrSettings {
  if (!settings.administratorIds?.includes(previousId)) throw new Error('原管理员已变化，请刷新后重试');
  if (previousId === nextId || settings.administratorIds.includes(nextId)) throw new Error('请选择其他非管理员成员');
  if (!people.some(person => person.id === nextId)) throw new Error('所选成员已失效，请重新选择');
  const grants = { ...settings.permissionGrants };
  delete grants[previousId];
  grants[nextId] = [...OKR_PERMISSIONS];
  return { ...settings, administratorIds: settings.administratorIds.map(id => id === previousId ? nextId : id), subAdministratorIds: (settings.subAdministratorIds || []).filter(id => id !== nextId), permissionGrants: grants };
}
