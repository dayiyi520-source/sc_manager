import { describe, expect, it } from 'vitest';
import type { OkrPayload, OkrPerson, OkrRecord } from './okrRepository';
import { departmentSubmissionErrors, departmentMonthlyFeedback } from './departmentReviewSubmission';
import { submitDepartmentReview } from './departmentReviewAggregation';
import { canReadReviewRecord } from './supervisorReview';
const people: OkrPerson[] = [
  { id: 'm', name: '主管', department: '产品', supervisorId: null, rootFlag: 0, version: 1 },
  { id: 'a', name: '员工甲', department: '产品', supervisorId: 'm', rootFlag: 0, version: 1 },
  { id: 'b', name: '员工乙', department: '产品', supervisorId: 'm', rootFlag: 0, version: 1 },
  { id: 'x', name: '其他部门', department: '交付', supervisorId: null, rootFlag: 0, version: 1 },
  { id: 'admin', name: '管理员', department: '管理', supervisorId: null, rootFlag: 1, version: 1 },
];
const payload: OkrPayload = { title: '部门月报', reviewMode: 'supervisor', reviewType: 'month', startDate: '2026-10-01', endDate: '2026-10-31' };
const report = (ownerId = 'a', extra: Partial<OkrRecord> = {}): OkrRecord => ({ id: ownerId, kind: 'review', ownerId, status: 'submitted', version: 1, periodKey: '2026-10', viewedBy: ['m'], payload: { ...payload, reviewMode: 'monthly', suggestions: '改善协作' }, ...extra });
describe('部门复盘本轮提交规则', () => {
  it('同时提示未提交和未读人员，不能用其他人的已读代替主管已读', () => {
    const errors = departmentSubmissionErrors(payload, [report('a', { viewedBy: ['admin'] })], people, 'm');
    expect(errors.join('；')).toContain('未提交：员工乙');
    expect(errors.join('；')).toContain('尚未读：员工甲');
    expect(() => submitDepartmentReview(payload, 'm', [report('a', { viewedBy: [] })], people)).toThrow('未提交');
  });
  it.each(['week', 'month'] as const)('只接受同类型同周期已提交且已读的%s报', reviewType => {
    const round = { ...payload, reviewType };
    const reports = [report('a'), report('b')].map(row => ({ ...row, payload: { ...row.payload, reviewType } }));
    expect(departmentSubmissionErrors(round, reports, people, 'm')).toEqual([]);
    for (const changed of [{ status: 'draft' }, { payload: { ...reports[0].payload, startDate: '2026-09-01' } }, { payload: { ...reports[0].payload, reviewType: reviewType === 'week' ? 'month' as const : 'week' as const } }]) {
      expect(departmentSubmissionErrors(round, [{ ...reports[0], ...changed }, reports[1]], people, 'm').join()).toContain('未提交：员工甲');
    }
  });
  it('仅允许本部门员工以非空原因排除且下一轮不继承', () => {
    const excluded = { ...payload, departmentReviewExclusions: [{ employeeId: 'b', reason: '本轮休假' }] };
    expect(departmentSubmissionErrors(excluded, [report()], people, 'm')).toEqual([]);
    expect(departmentSubmissionErrors(payload, [report()], people, 'm').join()).toContain('员工乙');
    for (const item of [{ employeeId: 'b', reason: ' ' }, { employeeId: 'x', reason: '外部门' }, { employeeId: 'b', reason: '长'.repeat(501) }]) {
      expect(departmentSubmissionErrors({ ...payload, departmentReviewExclusions: [item] }, [report()], people, 'm').length).toBeGreaterThan(0);
    }
  });
  it('从真实员工月报构建建议，忽略伪造姓名与建议且内容变化清空旧判断', () => {
    const saved = { ...payload, departmentFeedbackRows: [{ employeeId: 'a', employeeName: '伪造', reviewId: 'a', suggestion: '改善协作', judgment: '需公司解决' as const }] };
    expect(departmentMonthlyFeedback(saved, [report()], people, 'm')).toEqual([{ employeeId: 'a', employeeName: '员工甲', reviewId: 'a', suggestion: '改善协作', judgment: '需公司解决' }]);
    expect(departmentMonthlyFeedback(saved, [report('a', { payload: { ...report().payload, suggestions: '新建议' } })], people, 'm')[0].judgment).toBeUndefined();
  });
  it('服务提交保存建议和排除快照，并在重新提交校验时拒绝新出现的未读状态', () => {
    const submitted = { ...payload, departmentReviewExclusions: [{ employeeId: 'b', reason: '  本轮休假  ' }] };
    const result = submitDepartmentReview(submitted, 'm', [report()], people);
    expect(result.payload.departmentFeedbackRows?.[0].employeeName).toBe('员工甲');
    expect(result.payload.departmentReviewExclusions?.[0]).toMatchObject({ employeeName: '员工乙', reason: '本轮休假' });
    expect(() => submitDepartmentReview(submitted, 'm', [report('a', { viewedBy: [] })], people)).toThrow('尚未读');
  });
});
describe('他人复盘读取范围', () => {
  it('管理员全员、成员同部门，草稿始终仅本人可见', () => {
    expect(canReadReviewRecord(report('x'), 'admin', people)).toBe(true);
    expect(canReadReviewRecord(report('b'), 'a', people)).toBe(true);
    expect(canReadReviewRecord(report('x'), 'a', people)).toBe(false);
    expect(canReadReviewRecord(report('b', { status: 'draft' }), 'admin', people)).toBe(false);
    expect(canReadReviewRecord(report('a', { status: 'draft' }), 'a', people)).toBe(true);
    expect(canReadReviewRecord(report(), null, people)).toBe(false);
  });
});
