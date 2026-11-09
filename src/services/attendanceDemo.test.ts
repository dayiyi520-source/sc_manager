// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyAttendanceApprovalResult, applyLeaveApprovalResult, ATTENDANCE_DEMO_STORAGE_KEY, confirmLockedAttendanceCorrection, loadAttendanceDemo, saveAttendanceDemo } from './attendanceDemo';

describe('attendance demo persistence', () => {
  beforeEach(() => localStorage.clear());

  it('seeds demo records once and preserves them across reloads', () => {
    const state = loadAttendanceDemo();

    expect(state.attendanceRecords.length).toBeGreaterThan(0);
    expect(state.leaveApps.length).toBeGreaterThan(0);
    expect(state.overtimeRecords.length).toBeGreaterThan(0);
    expect(state.exceptions.length).toBeGreaterThan(0);
    expect(state.shiftSchedules.length).toBeGreaterThan(0);
    expect(localStorage.getItem(ATTENDANCE_DEMO_STORAGE_KEY)).not.toBeNull();

    const reloaded = loadAttendanceDemo();
    expect(reloaded).toEqual(state);
  });

  it('persists exception review changes', () => {
    const state = loadAttendanceDemo();
    const updated = { ...state, exceptions: state.exceptions.map(item => item.id === 'ex-01' ? { ...item, status: '已修正' } : item) };
    saveAttendanceDemo(updated);

    expect(loadAttendanceDemo().exceptions[0].status).toBe('已修正');
  });

  it('applies an approved attendance correction and keeps its approval history', () => {
    const state = loadAttendanceDemo();
    const next = applyAttendanceApprovalResult(state, 'ex-02', '已通过');
    saveAttendanceDemo(next);
    const restored = loadAttendanceDemo();

    expect(restored.attendanceRecords.find(record => record.id === 'att-10')).toMatchObject({
      originalStatus: '早退',
      status: '正常',
      sourceApprovalCode: 'AP-ATT-2026-1103',
    });
    expect(restored.exceptions.find(item => item.id === 'ex-02')).toMatchObject({
      approvalStatus: '已完成',
      correctionStatus: '已生效',
    });
    expect(restored.correctionHistory.some(item => item.exceptionId === 'ex-02' && item.status === '已生效')).toBe(true);
  });

  it('applies approved leave directly to the linked attendance detail', () => {
    const state = loadAttendanceDemo();
    state.leaveApps = state.leaveApps.map(item => item.id === 'leave-06' ? { ...item, approvalStatus: '审批中' } : item);
    state.attendanceRecords = state.attendanceRecords.map(item => item.id === 'att-12' ? { ...item, status: '缺勤', originalStatus: undefined, sourceApprovalCode: undefined } : item);
    const updated = applyLeaveApprovalResult(state, 'leave-06', '已通过');
    const leave = updated.leaveApps.find(item => item.id === 'leave-06')!;
    const attendance = updated.attendanceRecords.find(item => item.id === 'att-12')!;

    expect(leave.approvalStatus).toBe('已完成');
    expect(attendance.status).toBe('病假');
    expect(attendance.sourceApprovalCode).toBe('LEAVE-2026-1106');
    expect(updated.exceptions.some(item => item.approvalCode === 'LEAVE-2026-1106' && item.correctionStatus === '已生效')).toBe(true);
  });

  it('keeps a published month unchanged until HR confirms a correction', () => {
    localStorage.setItem('shichuang.frontend.demo.kpiPerformance.v1', JSON.stringify({ periods: { '2026-10': { published: true } } }));
    const state = loadAttendanceDemo();
    expect(confirmLockedAttendanceCorrection(state, 'ex-04', 'HR')).toBe(state);
    expect(state.attendanceRecords.find(record => record.id === 'att-13')?.status).toBe('缺卡');
    expect(state.exceptions.find(item => item.id === 'ex-04')?.correctionStatus).toBe('待HR更正');
  });
});
