import type { OKRItem } from '../../../types';
import type { OkrRecord } from '../../../services/okrRepository';
import { SupervisorObjectiveHeader } from './SupervisorObjectiveHeader';

/** Employee contributions must not replace the complete department objective progress. */
export function EmployeeObjectiveHeader({ objective, records, index, startDate, endDate, reviewType }: { objective: OKRItem; records: OkrRecord[]; index: number; startDate: string; endDate: string; reviewType: 'week' | 'month' }) {
  const own = records.find(record => record.id === objective.id);
  const source = own?.payload.sourceObjectiveId ? records.find(record => record.id === own.payload.sourceObjectiveId) : own;
  const department = source?.payload.goalLevel === 'department' ? source : undefined;
  const fullObjective: OKRItem = department ? { ...objective, objective: department.payload.title, weight: department.payload.weight ?? 100, keyResults: (department.payload.keyResults || []).map(kr => ({ id: kr.id, content: kr.title, progress: kr.progress, weight: kr.weight, deadline: kr.deadline || '' })) } : objective;
  const report = department && records.filter(record => record.kind === 'review' && record.ownerId === department.ownerId && ['submitted', 'reviewed', 'active'].includes(record.status) && record.payload.reviewType === reviewType && record.payload.startDate === startDate && record.payload.endDate === endDate).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  return <SupervisorObjectiveHeader objective={fullObjective} reviews={report?.payload.krReviews?.filter(row => row.objectiveId === department?.id) || []} index={index} objectiveWeight={fullObjective.weight}/>;
}
