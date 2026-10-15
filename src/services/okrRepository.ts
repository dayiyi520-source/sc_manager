import { restoreReturnedInitialDraft } from './okrSubmissionState';
import { apiRequest } from './apiClient';

export interface OkrPerson { goalRole?: 'supervisor' | 'employee'; id: string; name: string; department: string; jobTitle?: string; supervisorId: string | null; rootFlag: number; version: number }
export interface GoalTiming { deadline?: string; plannedDeadline?: string; forecastDeadline?: string; actualStartedAt?: string; actualCompletedAt?: string; delayReason?: string; delayResponsibility?: 'self' | 'dependency' | 'company'; }
export interface OkrExecutionAction extends GoalTiming { weight?: number; id: string; title: string; ownerId: string; progress: number; }
export interface OkrGoalChange { previousPayload?: OkrPayload; id: string; status: 'pending' | 'approved' | 'returned'; purpose?: 'initial' | 'update' | 'alignment' | 'delete'; reason: string; reviewerId: string; payload: OkrPayload; baseVersion: number; requestedAt: string; feedback?: string; reviewedAt?: string; }
export interface OkrKrDetail { productLineId?: string; progress?: number; id: string; name: string; version?: string; stage?: string; currentStage?: string; targetStage?: string; plannedStartDate?: string; plannedEndDate?: string; }
export interface OkrKr extends GoalTiming { details?: OkrKrDetail[]; structureType?: 'product' | 'delivery' | 'support'; executionActions?: OkrExecutionAction[]; confidence?: number; currentValue?: number; targetValue?: number; id: string; title: string; weight: number; progress: number; deadline?: string; assigneeIds?: string[]; businessObject?: string; version?: string; stage?: string; action?: string; result?: string }
export interface OkrAlignment { parentObjectiveId: string; parentKeyResultId?: string }
export interface OkrReviewItem { sourceLabel?:string; actualHours?:number; workId: string; title: string; status: string; workType?: 'task' | 'ticket'; objectiveId?: string; keyResultId?: string; affectedObjectiveId?: string; affectedKeyResultId?: string; result: string; impact: string; included?: boolean; sourceWorkOrderIds?: string }
export interface OkrKrReview { supervisorProgress?: Array<{ id: string; currentProgress: number }>; executionHealth?: '超预期' | '正常' | '风险' | '逾期'; detailRows?: OkrKrDetail[]; contributors?: Array<{ authorId: string; authorName: string; detailId: string; previousProgress: number; currentProgress: number; submitted: boolean }>; detailProgress?: Array<{ id:string; previousProgress:number; currentProgress:number }>; viewedEmployeeReviewIds?:string[]; supervisorJudgment?:string; employeeReviewSnapshots?:OkrWeeklyReviewSnapshot[]; objectiveId:string; objectiveTitle:string; keyResultId:string; keyResultTitle:string; previousProgress:number; currentProgress:number; health:'normal'|'risk'|'blocked'; achievement:string; blocker:string; nextPlan:string; evidenceNote?:string; workIds:string[] }
export interface OkrReviewAssistance { workId?:string; status?:string; subject:string; result:string; assistanceType?:string; expectedAssignee?:string; content?:string; expectedDueDate?:string }
export interface OkrReviewKnowledge { id:string; title:string; category:string; subCategory?:string; tags?:string[]; version?:string; summary?:string; content?:string; fileType?:string; linkUrl?:string; dingtalkUrl?:string; wecomUrl?:string }
export interface OkrExtraWork { workIds:string[]; description:string; impact:string; notes?:Record<string,string> }
export interface OkrMonthlyTask { id:string; content:string; result:string; status:string; sourceReviewId?:string; workId?:string }
export interface OkrMonthlyPlan { id:string; content:string; objectiveId?:string; keyResultId?:string; plannedDate?:string }
export interface OkrWeeklyReviewSnapshot {
  authorId?:string; authorName?:string;
  id:string; title:string; startDate:string; endDate:string; status:string; summary?:string; knowledgeEntries?:OkrReviewKnowledge[];
  krReviews:OkrKrReview[]; assistance:OkrReviewAssistance[]; extraWork?:OkrExtraWork; items:OkrReviewItem[];
}
export interface DepartmentReviewExclusion { employeeId: string; employeeName?: string; reason: string }
export interface DepartmentReviewFeedback { employeeId: string; employeeName: string; reviewId: string; suggestion: string; judgment?: '已内部解决' | '需公司解决' }
export interface OkrPayload extends GoalTiming {
  departmentReviewExclusions?: DepartmentReviewExclusion[];
  departmentFeedbackRows?: DepartmentReviewFeedback[];
  departmentObjectiveVersions?: Record<string, number>;
  departmentContentSnapshots?: OkrWeeklyReviewSnapshot[];
  objectiveTitleTemplateId?: string; objectiveTemplateKrTypes?: OkrTemplateKrType[];
  goalModelVersion?: 2; goalLevel?: 'company' | 'department' | 'personal';
  sourceKrData?: OkrKr; sourceObjectiveId?: string; sourceKrId?: string; sourceVersion?: number; sourceTitle?: string;
  origin?: 'assigned' | 'autonomous'; reviewerSuggestedSource?: string; sourceWithdrawalAcknowledged?: boolean;
  inherited?: boolean; changeReason?: string;

  reviewMode?: 'completed' | 'structured' | 'monthly' | 'supervisor'; reviewType?: 'week' | 'month'; selfScore?: number;
  krReviews?: OkrKrReview[]; assistance?: OkrReviewAssistance[]; extraWork?: OkrExtraWork; syncKrProgress?: boolean;
  knowledgeEntries?: OkrReviewKnowledge[];
  monthlyMetrics?: import('./monthlyReviewMetrics').MonthlyReviewMetrics;
  weeklyReviewIds?: string[]; weeklyReviewSnapshots?: OkrWeeklyReviewSnapshot[];
  monthlyOtherTasks?: OkrMonthlyTask[]; nextMonthPlans?: OkrMonthlyPlan[];
  otherNotes?: string; nextMonthArrangement?: string; nextWeekPlan?: string;
  uncompletedReason?: string; suggestions?: string; helpNeeded?: string; sendTo?: string[];
  weight?: number; deadline?: string;
  objectiveType?: 'target' | 'challenge'; note?: string;
  title: string; parentObjectiveId?: string; parentKeyResultId?: string; alignments?: OkrAlignment[]; keyResults?: OkrKr[]; progress?: number;
  startDate?: string; endDate?: string; summary?: string; items?: OkrReviewItem[];
  feedback?: string; finalScore?: number; evaluation?: string;
  objectiveSnapshots?: Array<{id:string;period:string;payload:OkrPayload}>;
}
export interface OkrActionPayload {
  recordId?: string; version?: number;
  title: string; department: string; parentObjectiveId: string; parentActionId: string; parentKeyResultId?: string;
  creatorId?: string; assigneeIds?: string[]; assigneeName?: string; structureType: string;
  productLine?: string; businessObject?: string; milestone?: string; acceptanceStandard?: string;
  deadline: string; weight: number;
  objectiveType?: 'target' | 'challenge';
  /** Weight assigned by the lower-level owner across all accepted parent actions. */
  commitmentWeight?: number;
  /** Sum of the sibling actions in this lower-level breakdown. */
  breakdownWeightTotal?: number;
}
export interface OkrProgressEntry { id: string; itemId: string; operatorId: string; createdAt: string; previousProgress: number; progress: number; status: 'normal' | 'risk' | 'overdue' | 'ahead'; note: string; attachments: Array<{ name: string; data: string }> }
export interface OkrRecord { viewedBy?: string[]; progressHistory?: OkrProgressEntry[]; id: string; kind: 'objective' | 'review' | 'action'; ownerId: string; periodKey: string; status: string; version: number; createdAt?: string; submittedAt?: string; changeRequest?: OkrGoalChange; changeHistory?: OkrGoalChange[]; payload: OkrPayload & Partial<OkrActionPayload> }
export interface OkrWork {
  statusChanges?: import('./monthlyReviewMetrics').ReviewStatusChange[];
  productLineId?: string; productLineName?: string; versionId?: string; versionName?: string;
  assigneeId?: string; creatorId?: string; participantIds?: string[]; participantNames?: string[];
  completedAt?: string; statusGroup?: string; id: string; sourceId: string; kind: string; title: string; status: string; ownerName?:string; creatorName?:string; actualHours: number; estimatedHours: number; dueDate: string; createdAt: string; updatedAt: string; sourceWorkOrderIds: string; objectiveId?:string; keyResultId?:string; linkVersion:number }
export type OkrTimeRule = {
  key: 'addObjective' | 'breakdown' | 'weeklyReview' | 'monthlyReview' | string;
  label: string;
  /** weeklyReview uses Monday=1 through Sunday=7; other rules use days of the month. */
  startDay: number;
  endDay: number;
  shortMonthRule?: 'clamp' | 'reject';
  allowBackfill?: boolean;
};
export type OkrTemplate = { department: string; departments?: string[]; type: string; fields: string[]; stages?: string[]; types?: string[] };
export type OkrCycleType = 'month' | 'quarter' | 'halfYear' | 'year';
export interface OkrCycleSettings { automatic: boolean; types: OkrCycleType[]; schedules: Record<OkrCycleType, { daysBefore: number; time: string }>; crossAlignment: boolean; periods: string[] }
export interface OkrConfirmationSettings { enabled: boolean; visiblePending: boolean; actions: ('create' | 'update' | 'delete')[]; types: ('target' | 'challenge')[]; missingSupervisor: 'auto' | 'upper' | 'admin'; selfSupervisor: 'auto' | 'upper'; exemptIds: string[]; companyEditorIds: string[] }
export type OkrTemplateKrType = 'product' | 'delivery' | 'support';
export interface OkrObjectiveTitleTemplate { krTypes?: OkrTemplateKrType[]; id: string; department: string; title: string; guidance: string; enabled: boolean }
export interface OkrWeeklyReviewCycle {
  id: string; month: string; startDate: string; endDate: string;
  template: 'byRole' | 'employee' | 'supervisor'; notifyAt: string; deadline: string; allowBackfill: boolean;
}
export interface OkrSettings { weeklyReviewCycles?: OkrWeeklyReviewCycle[]; supervisorIds?: string[]; objectiveTitleTemplates?: OkrObjectiveTitleTemplate[]; cycles?: OkrCycleSettings; administratorIds?: string[]; confirmation?: OkrConfirmationSettings; version?: number; defaultView: 'list'|'card'; timeRules: OkrTimeRule[]; validation: {actionWeightTotal:number;maxActions:number;assigneeMultiple:boolean;keyNodeMultiple:boolean;resultRequired:boolean}; dictionaries: {productNodes:string[];deliveryNodes:string[];presalesNodes:string[];supportTypes:string[]}; templates: OkrTemplate[] }
const base = '/api/okr';
export const okrRepository = {
  markViewed: (id: string, viewerId: string) => apiRequest<void>(`${base}/records/${encodeURIComponent(id)}/viewed`, { method: 'POST', body: JSON.stringify({ viewerId }) }),
  people: () => apiRequest<OkrPerson[]>(`${base}/people`),
  settings: () => apiRequest<OkrSettings>(`${base}/settings`),
  saveSettings: (settings: OkrSettings, viewerId?: string) => apiRequest<OkrSettings>(`${base}/settings`, {method:'PUT', body: JSON.stringify({...settings, viewerId})}),
  records: async (viewerId?: string): Promise<OkrRecord[]> => {
    const query = viewerId ? `?viewerId=${encodeURIComponent(viewerId)}` : '';
    const rows = await apiRequest<Array<Omit<OkrRecord,'payload'> & {payload: string | OkrPayload}>>(`${base}/records${query}`);
    return rows.map(r => restoreReturnedInitialDraft({...r, payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload}));
  },
  work: (ownerId: string) => apiRequest<OkrWork[]>(`${base}/work?ownerId=${encodeURIComponent(ownerId)}`),
  actionParents: (periodKey: string, viewerId?: string) => apiRequest<OkrRecord[]>(`${base}/actions/parents?periodKey=${encodeURIComponent(periodKey)}${viewerId ? `&viewerId=${encodeURIComponent(viewerId)}` : ''}`),
  createAction: (periodKey: string, payload: OkrActionPayload, submit = true, viewerId?: string) => apiRequest<{id:string}>(`${base}/actions`, {method:'POST',body:JSON.stringify({periodKey,payload,submit,viewerId})}),
  updateAction: (recordId: string, version: number, payload: OkrActionPayload, submit = false, viewerId?: string) => {
    const {recordId: _recordId, version: _version, ...actionPayload} = payload;
    return apiRequest<void>(`${base}/records/${recordId}`, {method:'PATCH',body:JSON.stringify({action: submit ? 'submit' : 'save', version, payload: actionPayload, viewerId})});
  },
  link: (work: OkrWork, objectiveId?:string,keyResultId?:string) => apiRequest(`${base}/work/link`,{method:'PUT',body:JSON.stringify({workId:work.id,objectiveId,keyResultId,version:work.linkVersion})}),
  create: (kind: string, periodKey: string, payload: OkrPayload, submit = false, viewerId?: string) => apiRequest<{id:string}>(`${base}/records`, {method:'POST',body:JSON.stringify({kind,periodKey,payload,submit,viewerId})}),
  update: (record: OkrRecord, action: string, data: Record<string, unknown> = {}, viewerId?: string) => apiRequest(`${base}/records/${record.id}`,{method:'PATCH',body:JSON.stringify({action,version:record.version,...data,viewerId})}),
  reporting: (person: OkrPerson, supervisorId: string | null, root: boolean) => apiRequest(`${base}/people/${person.id}`, {method:'PUT',body:JSON.stringify({supervisorId,root,version:person.version})}),
  events: (id: string) => apiRequest<Array<{action:string;operator:string;createdAt:string}>>(`${base}/${id}/events`),
};
