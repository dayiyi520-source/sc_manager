import type { DepartmentReviewFeedback, OkrPayload, OkrPerson, OkrRecord } from './okrRepository';

const submitted = new Set(['submitted', 'reviewed', 'active']);
export function departmentReviewMembers(people: OkrPerson[], ownerId: string) {
  const owner = people.find(person => person.id === ownerId);
  return owner?.department?.trim() ? people.filter(person => person.id !== ownerId && person.department.trim() === owner.department.trim()) : [];
}
export function departmentRoundReviews(payload: OkrPayload, records: OkrRecord[], people: OkrPerson[], ownerId: string) {
  return departmentReviewMembers(people, ownerId).map(employee => ({ employee, review: records
    .filter(record => record.kind === 'review' && record.ownerId === employee.id && submitted.has(record.status)
      && record.payload.reviewType === payload.reviewType && record.payload.startDate === payload.startDate && record.payload.endDate === payload.endDate)
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '') || b.version - a.version)[0] }));
}
export function departmentSubmissionErrors(payload: OkrPayload, records: OkrRecord[], people: OkrPerson[], ownerId: string) {
  if (payload.reviewMode !== 'supervisor') return [];
  const members = departmentReviewMembers(people, ownerId);
  const errors: string[] = [];
  if (!people.find(person => person.id === ownerId)?.department?.trim()) errors.push('尚未配置所属部门，无法校验部门员工复盘');
  const excluded = new Set<string>();
  for (const item of payload.departmentReviewExclusions || []) {
    if (!members.some(person => person.id === item.employeeId) || excluded.has(item.employeeId)) errors.push('排除员工无效或重复，请重新设置');
    if (!item.reason?.trim() || item.reason.trim().length > 500) errors.push('排除原因必填，且不能超过500字');
    excluded.add(item.employeeId);
  }
  const rows = departmentRoundReviews(payload, records, people, ownerId).filter(row => !excluded.has(row.employee.id));
  const missing = rows.filter(row => !row.review).map(row => row.employee.name);
  const unread = rows.filter(row => row.review && !row.review.viewedBy?.includes(ownerId)).map(row => row.employee.name);
  if (missing.length) errors.push(`以下员工本轮${payload.reviewType === 'month' ? '月报' : '周报'}未提交：${missing.join('、')}`);
  if (unread.length) errors.push(`以下员工本轮复盘尚未读：${unread.join('、')}`);
  return errors;
}
export function departmentMonthlyFeedback(payload: OkrPayload, records: OkrRecord[], people: OkrPerson[], ownerId: string): DepartmentReviewFeedback[] {
  return departmentRoundReviews(payload, records, people, ownerId).flatMap(({ employee, review }) => {
    const suggestion = review?.payload.suggestions?.trim();
    if (!review || !suggestion) return [];
    const saved = payload.departmentFeedbackRows?.find(row => row.employeeId === employee.id && row.reviewId === review.id && row.suggestion === suggestion);
    return [{ employeeId: employee.id, employeeName: employee.name, reviewId: review.id, suggestion, judgment: saved?.judgment }];
  });
}
