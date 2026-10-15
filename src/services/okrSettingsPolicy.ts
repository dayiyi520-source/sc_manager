import { normalizeLegacyReviewTemplates, validateReviewTemplates } from './reviewTemplateConfiguration';
import { validateWeeklyCycles } from './weeklyReviewCycles';
import { normalizeObjectiveTitleTemplates, validateObjectiveTitleTemplates } from './okrObjectiveTitleTemplates';
import type { OkrConfirmationSettings, OkrPerson, OkrRecord, OkrSettings } from './okrRepository';
import { defaultCycles, materializePeriods } from './okrPeriods';
export const defaultConfirmation = (): OkrConfirmationSettings => ({ enabled:true,visiblePending:true,actions:['create','update'],types:['target','challenge'],missingSupervisor:'admin',selfSupervisor:'auto',exemptIds:[],companyEditorIds:[] });
export function normalizedPolicy(settings: OkrSettings, people: OkrPerson[] = []): OkrSettings {
  return {...settings, ...(settings.reviewReportTemplates ? { reviewReportTemplates: normalizeLegacyReviewTemplates(settings.reviewReportTemplates) } : {}), cycles:materializePeriods({...defaultCycles(),...settings.cycles,schedules:{...defaultCycles().schedules,...settings.cycles?.schedules}}), administratorIds:settings.administratorIds ?? people.filter(p=>p.rootFlag).map(p=>p.id), confirmation:{...defaultConfirmation(),...settings.confirmation}};
}
export const isOkrAdmin = (viewer: string, settings: OkrSettings | undefined, people: OkrPerson[]) => settings?.administratorIds ? settings.administratorIds.includes(viewer) : !!people.find(p=>p.id===viewer)?.rootFlag;
export const canEditOkr = (record: OkrRecord, viewer: string, settings?: OkrSettings, people: OkrPerson[] = []) => record.ownerId === viewer || (record.payload.goalLevel === 'company' || record.kind === 'objective' && !!people.find(p=>p.id===record.ownerId)?.rootFlag) && (isOkrAdmin(viewer, settings, people) || !!settings?.confirmation?.companyEditorIds.includes(viewer));
export function confirmationReviewer(owner: OkrPerson, action: 'create'|'update'|'delete', payload: OkrRecord['payload'], settings: OkrSettings | undefined, people: OkrPerson[]): string | undefined {
  // Preserve pre-configuration behavior for previously saved projects.
  if (!settings?.confirmation) return owner.rootFlag || action === 'delete' || action === 'create' && payload.origin !== 'autonomous' ? undefined : owner.supervisorId || undefined;
  const policy = settings.confirmation;
  if (!policy.enabled || !policy.actions.includes(action) || !policy.types.includes(payload.objectiveType || 'target') || policy.exemptIds.includes(owner.id) || isOkrAdmin(owner.id,settings,people)) return undefined;
  const supervisor = people.find(p=>p.id===owner.supervisorId);
  if (supervisor && supervisor.id !== owner.id) return supervisor.id;
  const fallback = supervisor?.id === owner.id ? policy.selfSupervisor : policy.missingSupervisor;
  if (fallback === 'auto') return undefined;
  if (fallback === 'upper') {
    const upper = people.find(p=>p.id===supervisor?.supervisorId && p.id!==owner.id);
    if (upper) return upper.id;
    throw new Error('未找到上上级主管，请完善组织关系或调整目标确认配置');
  }
  const administrator = settings.administratorIds?.find(id=>id!==owner.id && people.some(p=>p.id===id));
  if (!administrator) throw new Error('未配置可用的 OKR 管理员');
  return administrator;
}
export function validatePolicy(settings: OkrSettings, people: OkrPerson[], previous?: OkrSettings) {
  const templateError = validateReviewTemplates(settings.reviewReportTemplates || [], previous?.reviewReportTemplates || []);
  if (templateError) return templateError;
  const cycleError = validateWeeklyCycles(settings.weeklyReviewCycles || [], previous?.weeklyReviewCycles || settings.weeklyReviewCycles || []);
  if (cycleError) return cycleError;
  if (settings.supervisorIds?.some(id => !people.some(person => person.id === id))) return '所选主管已失效，请重新选择';
  const titleError = validateObjectiveTitleTemplates(normalizeObjectiveTitleTemplates(settings));
  if (titleError) return titleError;
  const known = new Set(people.map(p=>p.id));
  if (!settings.administratorIds?.length || settings.administratorIds.some(id=>!known.has(id))) return '至少保留一名有效的 OKR 管理员';
  if (settings.confirmation && [...settings.confirmation.exemptIds,...settings.confirmation.companyEditorIds].some(id=>!known.has(id))) return '所选人员已失效，请重新选择';
  const cycles = settings.cycles;
  if (cycles) {
    if (!cycles.types.length || new Set(cycles.types).size !== cycles.types.length) return '请选择周期类型';
    for (const type of cycles.types) { const schedule = cycles.schedules[type]; if (!schedule || !Number.isInteger(schedule.daysBefore) || schedule.daysBefore<0 || schedule.daysBefore>31 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return '周期创建时间无效'; }
  }
  return undefined;
}
