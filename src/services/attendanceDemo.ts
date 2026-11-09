import type { AttendanceException, AttendanceRecord, LeaveApplication, OvertimeRecord, ShiftSchedule } from '../types';
import { isKpiMonthLocked } from './performanceMonthLock';

export const ATTENDANCE_DEMO_STORAGE_KEY = 'shichuang.frontend.demo.attendance.v1';

export interface AttendanceDemoState {
  schemaVersion: 2;
  attendanceRecords: AttendanceRecord[];
  leaveApps: LeaveApplication[];
  overtimeRecords: OvertimeRecord[];
  exceptions: AttendanceException[];
  shiftSchedules: ShiftSchedule[];
  correctionHistory: AttendanceCorrectionHistory[];
}

export interface AttendanceCorrectionHistory {
  id: string;
  exceptionId: string;
  employeeName: string;
  date: string;
  source: string;
  approvalCode?: string;
  before: string;
  after: string;
  status: '已生效' | '待HR更正' | '未生效';
  actor: string;
  at: string;
}

const initialState = (): AttendanceDemoState => ({
  schemaVersion: 2,
  attendanceRecords: [
    { id: 'att-01', empCode: 'SC1001', empName: '林知夏', department: '产品部', date: '2026-11-09', clockInTime: '08:56', clockOutTime: '18:08', workHours: 8.2, status: '正常' },
    { id: 'att-02', empCode: 'SC1002', empName: '周予安', department: '产品部', date: '2026-11-09', clockInTime: '09:18', clockOutTime: '18:02', workHours: 7.7, status: '迟到' },
    { id: 'att-03', empCode: 'SC1003', empName: '顾清和', department: '研发部', date: '2026-11-09', clockInTime: '08:49', clockOutTime: '18:22', workHours: 8.6, status: '正常' },
    { id: 'att-04', empCode: 'SC1004', empName: '许明川', department: '研发部', date: '2026-11-09', clockInTime: '09:01', clockOutTime: '17:46', workHours: 7.8, status: '早退' },
    { id: 'att-05', empCode: 'SC1005', empName: '沈嘉禾', department: '交付部', date: '2026-11-09', clockInTime: '08:52', clockOutTime: '18:11', workHours: 8.3, status: '正常' },
    { id: 'att-06', empCode: 'SC1006', empName: '唐以宁', department: '运营部', date: '2026-11-09', clockInTime: '09:04', clockOutTime: '18:00', workHours: 8, status: '正常' },
    { id: 'att-07', empCode: 'SC1001', empName: '林知夏', department: '产品部', date: '2026-11-06', clockInTime: '08:58', clockOutTime: '18:12', workHours: 8.2, status: '正常' },
    { id: 'att-08', empCode: 'SC1003', empName: '顾清和', department: '研发部', date: '2026-11-06', clockInTime: '09:12', clockOutTime: '18:06', workHours: 7.9, status: '迟到' },
    { id: 'att-09', empCode: 'SC1002', empName: '周予安', department: '产品部', date: '2026-11-04', clockInTime: '09:02', clockOutTime: '18:06', workHours: 8.1, status: '正常', originalStatus: '缺卡', sourceApprovalCode: 'AP-ATT-2026-1104', sourceApprovalType: '补卡审批', correctionNote: '审批通过后自动补卡生效' },
    { id: 'att-10', empCode: 'SC1004', empName: '许明川', department: '研发部', date: '2026-11-03', clockInTime: '09:01', clockOutTime: '17:46', workHours: 7.8, status: '早退' },
    { id: 'att-11', empCode: 'SC1006', empName: '唐以宁', department: '运营部', date: '2026-11-02', clockInTime: '09:04', clockOutTime: '18:00', workHours: 8, status: '正常', originalStatus: '迟到', correctionNote: 'HR 人工核实交通管制并修正' },
    { id: 'att-12', empCode: 'SC1006', empName: '唐以宁', department: '运营部', date: '2026-11-06', clockInTime: '-', clockOutTime: '-', workHours: 0, status: '病假', originalStatus: '缺勤', sourceApprovalCode: 'LEAVE-2026-1106', sourceApprovalType: '请假审批', correctionNote: '审批通过后按病假更新考勤' },
    { id: 'att-13', empCode: 'SC1006', empName: '唐以宁', department: '运营部', date: '2026-10-28', clockInTime: '09:05', clockOutTime: '-', workHours: 0, status: '缺卡' },
  ],
  leaveApps: [
    { id: 'leave-01', code: 'LEAVE-2026-1101', applicant: '周予安', department: '产品部', type: '年假', startTime: '2026-11-12 09:00', endTime: '2026-11-12 18:00', days: 1, reason: '个人事务安排', approvalStatus: '已通过' },
    { id: 'leave-02', code: 'LEAVE-2026-1102', applicant: '许明川', department: '研发部', type: '调休', startTime: '2026-11-13 13:00', endTime: '2026-11-13 18:00', days: 0.5, reason: '调休本月周末值班', approvalStatus: '待审批' },
    { id: 'leave-03', code: 'LEAVE-2026-1103', applicant: '沈嘉禾', department: '交付部', type: '病假', startTime: '2026-11-10 09:00', endTime: '2026-11-10 18:00', days: 1, reason: '身体不适就诊', approvalStatus: '审批中' },
    { id: 'leave-04', code: 'LEAVE-2026-1104', applicant: '唐以宁', department: '运营部', type: '事假', startTime: '2026-11-05 09:00', endTime: '2026-11-05 18:00', days: 1, reason: '处理家庭事务', approvalStatus: '已驳回' },
    { id: 'leave-05', code: 'LEAVE-2026-1105', applicant: '顾清和', department: '研发部', type: '年假', startTime: '2026-11-18 09:00', endTime: '2026-11-19 18:00', days: 2, reason: '年度休假安排', approvalStatus: '已通过' },
    { id: 'leave-06', code: 'LEAVE-2026-1106', applicant: '唐以宁', department: '运营部', type: '病假', startTime: '2026-11-06 09:00', endTime: '2026-11-06 18:00', days: 1, reason: '身体不适就诊', approvalStatus: '已通过', linkedAttendanceIds: ['att-12'] },
  ],
  overtimeRecords: [
    { id: 'ot-01', code: 'OT-2026-1101', empName: '顾清和', department: '研发部', date: '2026-11-07', timeSlot: '18:30-21:30', hours: 3, type: '周末加班', reason: '版本联调与回归验证', status: '已通过' },
    { id: 'ot-02', code: 'OT-2026-1102', empName: '林知夏', department: '产品部', date: '2026-11-05', timeSlot: '18:30-20:30', hours: 2, type: '工作日加班', reason: '客户方案评审材料', status: '已通过' },
    { id: 'ot-03', code: 'OT-2026-1103', empName: '许明川', department: '研发部', date: '2026-11-08', timeSlot: '09:00-13:00', hours: 4, type: '周末加班', reason: '服务稳定性专项排查', status: '审批中' },
    { id: 'ot-04', code: 'OT-2026-1104', empName: '沈嘉禾', department: '交付部', date: '2026-11-03', timeSlot: '18:30-21:00', hours: 2.5, type: '工作日加班', reason: '客户现场问题闭环', status: '待审批' },
    { id: 'ot-05', code: 'OT-2026-1105', empName: '唐以宁', department: '运营部', date: '2026-11-01', timeSlot: '10:00-14:00', hours: 4, type: '法定节假日加班', reason: '系统切换值守', status: '已通过' },
  ],
  exceptions: [
    { id: 'ex-01', empName: '周予安', department: '产品部', date: '2026-11-04', exceptionType: '缺卡', reason: '外出客户现场，忘记补录下班卡', status: '已修正', source: '审批中心', approvalCode: 'AP-ATT-2026-1104', approvalType: '补卡审批', approvalStatus: '已通过', linkedAttendanceId: 'att-09', originalStatus: '缺卡', effectiveStatus: '正常', correctionStatus: '已生效', processedBy: '审批流自动同步', processedAt: '2026-11-05 10:24' },
    { id: 'ex-02', empName: '许明川', department: '研发部', date: '2026-11-03', exceptionType: '早退', reason: '已提交外出审批，申请核对考勤', status: '审批中', source: '审批中心', approvalCode: 'AP-ATT-2026-1103', approvalType: '考勤异常申诉审批', approvalStatus: '审批中', linkedAttendanceId: 'att-10', originalStatus: '早退', effectiveStatus: '正常', correctionStatus: '审批中' },
    { id: 'ex-03', empName: '唐以宁', department: '运营部', date: '2026-11-02', exceptionType: '迟到', reason: '交通管制导致到岗延迟', status: '已修正', source: 'HR人工修改', originalStatus: '迟到', effectiveStatus: '正常', correctionStatus: '已生效', processedBy: 'HR 陈岚', processedAt: '2026-11-02 14:36' },
    { id: 'ex-04', empName: '唐以宁', department: '运营部', date: '2026-10-28', exceptionType: '缺卡', reason: '审批已通过，但 10 月绩效已公示，等待 HR 确认更正。', status: '待HR更正', source: '审批中心', approvalCode: 'AP-ATT-2026-1028', approvalType: '补卡审批', approvalStatus: '已通过', linkedAttendanceId: 'att-13', originalStatus: '缺卡', effectiveStatus: '正常', correctionStatus: '待HR更正' },
    { id: 'leave-correction-leave-06-att-12', empName: '唐以宁', department: '运营部', date: '2026-11-06', exceptionType: '病假', reason: '请假审批通过后自动按病假更新考勤。', status: '已修正', source: '审批中心', approvalCode: 'LEAVE-2026-1106', approvalType: '请假审批', approvalStatus: '已通过', linkedAttendanceId: 'att-12', originalStatus: '缺勤', effectiveStatus: '病假', correctionStatus: '已生效', processedBy: '审批流自动同步', processedAt: '2026-11-05 17:05' },
  ],
  shiftSchedules: [
    { id: 'shift-01', deptName: '产品部', shiftName: '标准班', workTime: '09:00-18:00', empCount: 12, status: '已发布' },
    { id: 'shift-02', deptName: '研发部', shiftName: '弹性班', workTime: '09:00-18:30', empCount: 26, status: '已发布' },
    { id: 'shift-03', deptName: '交付部', shiftName: '标准班', workTime: '09:00-18:00', empCount: 18, status: '待确认' },
    { id: 'shift-04', deptName: '运营部', shiftName: '值守班', workTime: '10:00-19:00', empCount: 9, status: '已发布' },
  ],
  correctionHistory: [
    { id: 'corr-01', exceptionId: 'ex-01', employeeName: '周予安', date: '2026-11-04', source: '补卡审批', approvalCode: 'AP-ATT-2026-1104', before: '缺卡', after: '正常', status: '已生效', actor: '审批流自动同步', at: '2026-11-05 10:24' },
    { id: 'corr-02', exceptionId: 'ex-03', employeeName: '唐以宁', date: '2026-11-02', source: 'HR 人工修改', before: '迟到', after: '正常', status: '已生效', actor: 'HR 陈岚', at: '2026-11-02 14:36' },
    { id: 'corr-03', exceptionId: 'ex-04', employeeName: '唐以宁', date: '2026-10-28', source: '补卡审批', approvalCode: 'AP-ATT-2026-1028', before: '缺卡', after: '正常', status: '待HR更正', actor: '审批流自动同步', at: '2026-10-29 09:16' },
    { id: 'corr-leave-correction-leave-06-att-12', exceptionId: 'leave-correction-leave-06-att-12', employeeName: '唐以宁', date: '2026-11-06', source: '请假审批', approvalCode: 'LEAVE-2026-1106', before: '缺勤', after: '病假', status: '已生效', actor: '审批流自动同步', at: '2026-11-05 17:05' },
  ],
});

const mergeById = <T extends { id: string }>(defaults: T[], saved?: T[]) => {
  const existing = new Map((saved || []).map(item => [item.id, item]));
  const merged = defaults.map(item => ({ ...item, ...existing.get(item.id) }));
  return [...merged, ...(saved || []).filter(item => !defaults.some(defaultItem => defaultItem.id === item.id))];
};

export const loadAttendanceDemo = (): AttendanceDemoState => {
  try {
    const stored = localStorage.getItem(ATTENDANCE_DEMO_STORAGE_KEY);
    if (stored) {
      const saved = JSON.parse(stored) as Partial<AttendanceDemoState>;
      const defaults = initialState();
      const migrated: AttendanceDemoState = {
        ...defaults,
        ...saved,
        schemaVersion: 2,
        attendanceRecords: mergeById(defaults.attendanceRecords, saved.attendanceRecords),
        leaveApps: mergeById(defaults.leaveApps, saved.leaveApps),
        overtimeRecords: mergeById(defaults.overtimeRecords, saved.overtimeRecords),
        exceptions: mergeById(defaults.exceptions, saved.exceptions),
        shiftSchedules: mergeById(defaults.shiftSchedules, saved.shiftSchedules),
        correctionHistory: mergeById(defaults.correctionHistory, saved.correctionHistory),
      };
      localStorage.setItem(ATTENDANCE_DEMO_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    const seeded = initialState();
    localStorage.setItem(ATTENDANCE_DEMO_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return initialState();
  }
};

export const saveAttendanceDemo = (state: AttendanceDemoState) => {
  localStorage.setItem(ATTENDANCE_DEMO_STORAGE_KEY, JSON.stringify(state));
};

const changeRecordStatus = (state: AttendanceDemoState, exception: AttendanceException, actor: string): AttendanceDemoState => {
  if (!exception.linkedAttendanceId || !exception.effectiveStatus) return state;
  const record = state.attendanceRecords.find(item => item.id === exception.linkedAttendanceId);
  if (!record) return state;
  const locked = isKpiMonthLocked(exception.date.slice(0, 7));
  if (locked && exception.correctionStatus === '待HR更正' && exception.status === '待HR更正' && exception.approvalStatus === '已完成') return state;
  if (!locked && exception.correctionStatus === '已生效' && record.status === exception.effectiveStatus && record.sourceApprovalCode === exception.approvalCode) return state;
  const correctionStatus: AttendanceException['correctionStatus'] = locked ? '待HR更正' : '已生效';
  const status = locked ? '待HR更正' : '已修正';
  const at = new Date().toLocaleString('zh-CN', { hour12: false });
  const nextException = { ...exception, status, correctionStatus, processedBy: actor, processedAt: at };
  const nextState: AttendanceDemoState = {
    ...state,
    exceptions: state.exceptions.map(item => item.id === exception.id ? nextException : item),
    attendanceRecords: locked ? state.attendanceRecords : state.attendanceRecords.map(item => item.id === record.id ? {
      ...item,
      originalStatus: item.originalStatus || record.status,
      status: exception.effectiveStatus!,
      sourceApprovalCode: exception.approvalCode,
      sourceApprovalType: exception.approvalType,
      correctionNote: `审批单 ${exception.approvalCode || 'HR 人工处理'} 已生效`,
    } : item),
    correctionHistory: mergeById(state.correctionHistory, [{
      id: `corr-${exception.id}`,
      exceptionId: exception.id,
      employeeName: exception.empName,
      date: exception.date,
      source: exception.approvalType || exception.source || 'HR 人工修改',
      approvalCode: exception.approvalCode,
      before: record.status,
      after: exception.effectiveStatus,
      status: correctionStatus,
      actor,
      at,
    }]),
  };
  return nextState;
};

export const applyAttendanceApprovalResult = (
  state: AttendanceDemoState,
  approvalCode: string,
  approvalStatus: string,
): AttendanceDemoState => {
  const exception = state.exceptions.find(item => item.id === approvalCode || item.approvalCode === approvalCode);
  if (!exception || exception.source !== '审批中心') return state;
  const normalizedStatus = approvalStatus === '已通过' || approvalStatus === '已完成' ? '已完成' : approvalStatus;
  if (normalizedStatus === exception.approvalStatus && (normalizedStatus !== '已完成' || ['已生效', '待HR更正'].includes(exception.correctionStatus || ''))) return state;
  if (normalizedStatus !== '已完成') {
    const status = normalizedStatus === '已驳回' ? '已驳回' : normalizedStatus;
    return { ...state, exceptions: state.exceptions.map(item => item.id === exception.id ? { ...item, approvalStatus: normalizedStatus, status, correctionStatus: normalizedStatus === '已驳回' ? '未生效' : '审批中' } : item) };
  }
  return changeRecordStatus({ ...state, exceptions: state.exceptions.map(item => item.id === exception.id ? { ...item, approvalStatus: normalizedStatus } : item) }, { ...exception, approvalStatus: normalizedStatus }, '审批流自动同步');
};

export const applyLeaveApprovalResult = (
  state: AttendanceDemoState,
  approvalCode: string,
  approvalStatus: string,
): AttendanceDemoState => {
  const leave = state.leaveApps.find(item => item.id === approvalCode || item.code === approvalCode);
  if (!leave) return state;
  const normalizedStatus = approvalStatus === '已通过' || approvalStatus === '已完成' ? '已完成' : approvalStatus;
  if (leave.approvalStatus === normalizedStatus && (normalizedStatus !== '已完成' || leave.linkedAttendanceIds?.every(id => state.attendanceRecords.find(record => record.id === id)?.sourceApprovalCode === leave.code))) return state;
  const nextState = { ...state, leaveApps: state.leaveApps.map(item => item.id === leave.id ? { ...item, approvalStatus: normalizedStatus } : item) };
  if (normalizedStatus !== '已完成' || !leave.linkedAttendanceIds?.length) return nextState;

  let updated = nextState;
  for (const attendanceId of leave.linkedAttendanceIds) {
    const record = updated.attendanceRecords.find(item => item.id === attendanceId);
    if (!record) continue;
    const exceptionId = `leave-correction-${leave.id}-${attendanceId}`;
    const correction: AttendanceException = {
      id: exceptionId,
      empName: leave.applicant,
      department: leave.department,
      date: record.date,
      exceptionType: leave.type,
      reason: `请假审批通过，按最终审批结果更新考勤。${leave.reason || ''}`,
      status: '已通过',
      source: '审批中心',
      approvalCode: leave.code,
      approvalType: '请假审批',
      approvalStatus: normalizedStatus,
      linkedAttendanceId: attendanceId,
      originalStatus: record.originalStatus || record.status,
      effectiveStatus: leave.type,
      correctionStatus: '已生效',
    };
    const locked = isKpiMonthLocked(record.date.slice(0, 7));
    if (locked) {
      correction.status = '待HR更正';
      correction.correctionStatus = '待HR更正';
      const history: AttendanceCorrectionHistory = {
        id: `corr-${exceptionId}`,
        exceptionId,
        employeeName: leave.applicant,
        date: record.date,
        source: '请假审批',
        approvalCode: leave.code,
        before: record.status,
        after: leave.type,
        status: '待HR更正',
        actor: '审批流自动同步',
        at: new Date().toLocaleString('zh-CN', { hour12: false }),
      };
      updated = { ...updated, exceptions: mergeById(updated.exceptions, [correction]), correctionHistory: mergeById(updated.correctionHistory, [history]) };
    } else {
      updated = { ...updated, exceptions: mergeById(updated.exceptions, [correction]) };
      updated = changeRecordStatus(updated, correction, '审批流自动同步');
    }
  }
  return updated;
};

export const confirmLockedAttendanceCorrection = (state: AttendanceDemoState, exceptionId: string, actor: string): AttendanceDemoState => {
  const exception = state.exceptions.find(item => item.id === exceptionId);
  if (!exception || exception.correctionStatus !== '待HR更正' || !exception.approvalCode) return state;
  if (isKpiMonthLocked(exception.date.slice(0, 7))) return state;
  return changeRecordStatus(state, exception, actor);
};

export interface AttendanceKpiAdjustment {
  lateCountDelta: number;
  missingPunchDelta: number;
  leaveRecords: Record<string, number>;
  approvalSummary: string[];
  hasLeaveApplications: boolean;
}

export const attendanceKpiAdjustments = (month: string): Record<string, AttendanceKpiAdjustment> => {
  const state = loadAttendanceDemo();
  const adjustments: Record<string, AttendanceKpiAdjustment> = {};
  const getAdjustment = (name: string): AttendanceKpiAdjustment => adjustments[name] ||= { lateCountDelta: 0, missingPunchDelta: 0, leaveRecords: {}, approvalSummary: [], hasLeaveApplications: false };
  for (const exception of state.exceptions) {
    if (!exception.date.startsWith(month) || exception.correctionStatus !== '已生效' || exception.approvalType === '请假审批' || !exception.originalStatus || !exception.effectiveStatus) continue;
    const adjustment = getAdjustment(exception.empName);
    adjustment.lateCountDelta += Number(exception.effectiveStatus === '迟到') - Number(exception.originalStatus === '迟到');
    adjustment.missingPunchDelta += Number(exception.effectiveStatus === '缺卡') - Number(exception.originalStatus === '缺卡');
    adjustment.approvalSummary.push(`${exception.approvalCode || 'HR人工修改'} · ${exception.approvalType || '人工更正'} 已生效`);
  }
  const monthlyLeaves = state.leaveApps.filter(item => (item.startTime || item.startDate || '').startsWith(month));
  for (const leave of monthlyLeaves) {
    const adjustment = getAdjustment(leave.applicant);
    adjustment.hasLeaveApplications = true;
    if (['已通过', '已完成'].includes(leave.approvalStatus || '') && !isKpiMonthLocked(month)) {
      adjustment.leaveRecords[leave.type] = (adjustment.leaveRecords[leave.type] || 0) + leave.days;
      adjustment.approvalSummary.push(`${leave.code || '请假审批'} · ${leave.type} ${leave.days}天 已生效`);
    } else {
      adjustment.approvalSummary.push(`${leave.code || '请假审批'} · ${leave.type} 未计入（${leave.approvalStatus || '待审批'}）`);
    }
  }
  return adjustments;
};
