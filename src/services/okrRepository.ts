import { apiRequest } from './apiClient';

export interface OkrPerson { id: string; name: string; department: string; supervisorId: string | null; rootFlag: number; version: number }
export interface OkrKr { id: string; title: string; weight: number; progress: number; deadline?: string; assigneeIds?: string[] }
export interface OkrAlignment { parentObjectiveId: string; parentKeyResultId?: string }
export interface OkrReviewItem { workId: string; title: string; status: string; workType?: 'task' | 'ticket'; objectiveId?: string; keyResultId?: string; affectedObjectiveId?: string; affectedKeyResultId?: string; result: string; impact: string; included?: boolean; sourceWorkOrderIds?: string }
export interface OkrKrReview { objectiveId:string; objectiveTitle:string; keyResultId:string; keyResultTitle:string; previousProgress:number; currentProgress:number; health:'normal'|'risk'|'blocked'; achievement:string; blocker:string; nextPlan:string; evidenceNote?:string; workIds:string[] }
export interface OkrReviewAssistance { subject:string; result:string; assistanceType?:string; expectedAssignee?:string; content?:string; expectedDueDate?:string }
export interface OkrExtraWork { workIds:string[]; description:string; impact:string; notes?:Record<string,string> }
export interface OkrMonthlyTask { id:string; content:string; result:string; status:string; sourceReviewId?:string; workId?:string }
export interface OkrMonthlyPlan { id:string; content:string; objectiveId?:string; keyResultId?:string; plannedDate?:string }
export interface OkrWeeklyReviewSnapshot {
  id:string; title:string; startDate:string; endDate:string; status:string; summary?:string;
  krReviews:OkrKrReview[]; assistance:OkrReviewAssistance[]; extraWork?:OkrExtraWork; items:OkrReviewItem[];
}
export interface OkrPayload {
  reviewMode?: 'completed' | 'structured' | 'monthly'; reviewType?: 'week' | 'month'; selfScore?: number;
  krReviews?: OkrKrReview[]; assistance?: OkrReviewAssistance[]; extraWork?: OkrExtraWork; syncKrProgress?: boolean;
  weeklyReviewIds?: string[]; weeklyReviewSnapshots?: OkrWeeklyReviewSnapshot[];
  monthlyOtherTasks?: OkrMonthlyTask[]; nextMonthPlans?: OkrMonthlyPlan[];
  otherNotes?: string; nextMonthArrangement?: string;
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
export interface OkrRecord { id: string; kind: 'objective' | 'review' | 'action'; ownerId: string; periodKey: string; status: string; version: number; createdAt?: string; payload: OkrPayload & Partial<OkrActionPayload> }
export interface OkrWork { id: string; sourceId: string; kind: string; title: string; status: string; ownerName?:string; creatorName?:string; actualHours: number; estimatedHours: number; dueDate: string; createdAt: string; updatedAt: string; sourceWorkOrderIds: string; objectiveId?:string; keyResultId?:string; linkVersion:number }
export interface OkrSettings { version?: number; defaultView: 'list'|'card'; timeRules: Array<{key:string;label:string;startDay:number;endDay:number}>; validation: {actionWeightTotal:number;maxActions:number;assigneeMultiple:boolean;keyNodeMultiple:boolean;resultRequired:boolean}; dictionaries: {productNodes:string[];deliveryNodes:string[];presalesNodes:string[];supportTypes:string[]}; templates: Array<{department:string;type:string;fields:string[]}> }
const base = '/api/okr';
export const okrRepository = {
  people: () => apiRequest<OkrPerson[]>(`${base}/people`),
  settings: () => apiRequest<OkrSettings>(`${base}/settings`),
  saveSettings: (settings: OkrSettings) => apiRequest<OkrSettings>(`${base}/settings`, {method:'PUT', body: JSON.stringify(settings)}),
  records: async (): Promise<OkrRecord[]> => {
    const rows = await apiRequest<Array<Omit<OkrRecord,'payload'> & {payload: string | OkrPayload}>>(`${base}/records`);
    return rows.map(r => ({...r, payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload}));
  },
  work: (ownerId: string) => apiRequest<OkrWork[]>(`${base}/work?ownerId=${encodeURIComponent(ownerId)}`),
  actionParents: (periodKey: string, viewerId?: string) => apiRequest<OkrRecord[]>(`${base}/actions/parents?periodKey=${encodeURIComponent(periodKey)}${viewerId ? `&viewerId=${encodeURIComponent(viewerId)}` : ''}`),
  createAction: (periodKey: string, payload: OkrActionPayload, submit = true, viewerId?: string) => apiRequest<{id:string}>(`${base}/actions`, {method:'POST',body:JSON.stringify({periodKey,payload,submit,viewerId})}),
  updateAction: (recordId: string, version: number, payload: OkrActionPayload, submit = false, viewerId?: string) => {
    const {recordId: _recordId, version: _version, ...actionPayload} = payload;
    return apiRequest<void>(`${base}/records/${recordId}`, {method:'PATCH',body:JSON.stringify({action: submit ? 'submit' : 'save', version, payload: actionPayload, viewerId})});
  },
  link: (work: OkrWork, objectiveId?:string,keyResultId?:string) => apiRequest(`${base}/work/link`,{method:'PUT',body:JSON.stringify({workId:work.id,objectiveId,keyResultId,version:work.linkVersion})}),
  create: (kind: string, periodKey: string, payload: OkrPayload, submit = false) => apiRequest<{id:string}>(`${base}/records`, {method:'POST',body:JSON.stringify({kind,periodKey,payload,submit})}),
  update: (record: OkrRecord, action: string, data: Record<string, unknown> = {}) => apiRequest(`${base}/records/${record.id}`,{method:'PATCH',body:JSON.stringify({action,version:record.version,...data})}),
  reporting: (person: OkrPerson, supervisorId: string | null, root: boolean) => apiRequest(`${base}/people/${person.id}`, {method:'PUT',body:JSON.stringify({supervisorId,root,version:person.version})}),
  events: (id: string) => apiRequest<Array<{action:string;operator:string;createdAt:string}>>(`${base}/${id}/events`),
};
