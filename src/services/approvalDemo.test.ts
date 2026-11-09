// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { ApprovalFlow } from '../types';
import { APPROVAL_DEMO_STORAGE_KEY, loadApprovalFlows, saveApprovalFlows, syncAttendanceApprovals } from './approvalDemo';
import { loadAttendanceDemo } from './attendanceDemo';

const flow = (status: ApprovalFlow['status']): ApprovalFlow => ({
  id: 'attendance-flow',
  code: 'AP-ATT-2026-1103',
  title: '考勤异常复核',
  type: '考勤异常申诉审批',
  applicantName: '许明川',
  applicantDept: '研发部',
  status,
  submittedAt: '2026-11-03 18:05',
  nodes: [],
  contentDetails: {},
});

describe('attendance approval bridge', () => {
  beforeEach(() => localStorage.clear());

  it('preserves approval decisions across reloads', () => {
    saveApprovalFlows([flow('已完成')]);
    expect(loadApprovalFlows([flow('审批中')])[0].status).toBe('已完成');
    expect(localStorage.getItem(APPROVAL_DEMO_STORAGE_KEY)).not.toBeNull();
  });

  it('updates effective attendance only after the approval is complete', () => {
    syncAttendanceApprovals([flow('审批中')]);
    expect(loadAttendanceDemo().attendanceRecords.find(record => record.id === 'att-10')?.status).toBe('早退');

    syncAttendanceApprovals([flow('已完成')]);
    const state = loadAttendanceDemo();
    expect(state.attendanceRecords.find(record => record.id === 'att-10')).toMatchObject({
      status: '正常',
      sourceApprovalCode: 'AP-ATT-2026-1103',
    });
    expect(state.correctionHistory.filter(item => item.exceptionId === 'ex-02')).toHaveLength(1);
  });
});
