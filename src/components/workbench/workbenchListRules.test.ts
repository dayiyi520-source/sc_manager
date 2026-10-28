import { describe, expect, it } from 'vitest';
import type { ApprovalFlow } from '../../types';
import { latestItems, pendingFor, reviewedBy } from './workbenchListRules';

const flow = (status: ApprovalFlow['status'], nodes: ApprovalFlow['nodes']): ApprovalFlow => ({
  id: 'one', code: 'A-1', title: '审批', type: '合同用印审批', applicantName: '申请人', applicantDept: '业务部', status, submittedAt: '2026-10-28', nodes, contentDetails: {},
});

describe('workbench list rules', () => {
  it('counts only the current approver as pending and actual handled nodes as reviewed', () => {
    const waiting = flow('待审批', [{ title: '一审', approver: '本人', role: '主管', status: 'passed' }, { title: '二审', approver: '同事', role: '经理', status: 'current' }]);
    expect(pendingFor(waiting, '本人')).toBe(false);
    expect(reviewedBy(waiting, '本人')).toBe(true);
    expect(pendingFor(waiting, '同事')).toBe(true);
    expect(reviewedBy(waiting, '同事')).toBe(false);
    expect(reviewedBy(flow('已驳回', [{ title: '一审', approver: '本人', role: '主管', status: 'rejected' }]), '本人')).toBe(true);
    expect(reviewedBy(flow('已通过', [{ title: '一审', approver: '他人', role: '主管', status: 'passed' }]), '本人')).toBe(false);
  });

  it('shows the newest ten by record time without mutating input and puts missing dates last', () => {
    const items = [{ id: 'missing', time: '' }, ...Array.from({ length: 11 }, (_, i) => ({ id: String(i), time: `2026-10-${String(i + 1).padStart(2, '0')}` }))];
    expect(latestItems(items, item => item.time, 10).map(item => item.id)).toEqual(Array.from({ length: 10 }, (_, i) => String(10 - i)));
    expect(items[0].id).toBe('missing');
  });
});
