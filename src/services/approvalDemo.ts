import type { ApprovalFlow } from '../types';
import { applyAttendanceApprovalResult, applyLeaveApprovalResult, loadAttendanceDemo, saveAttendanceDemo } from './attendanceDemo';

export const APPROVAL_DEMO_STORAGE_KEY = 'shichuang.frontend.demo.approvals.v1';

export const loadApprovalFlows = (defaults: ApprovalFlow[]): ApprovalFlow[] => {
  try {
    const raw = localStorage.getItem(APPROVAL_DEMO_STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as ApprovalFlow[];
    if (!Array.isArray(saved)) return defaults;
    const savedById = new Map(saved.map(flow => [flow.id, flow]));
    return [...defaults.map(flow => ({ ...flow, ...savedById.get(flow.id) })), ...saved.filter(flow => !defaults.some(item => item.id === flow.id))];
  } catch {
    return defaults;
  }
};

export const saveApprovalFlows = (approvals: ApprovalFlow[]) => {
  try {
    localStorage.setItem(APPROVAL_DEMO_STORAGE_KEY, JSON.stringify(approvals));
  } catch {
    return;
  }
};

export const syncAttendanceApprovals = (approvals: ApprovalFlow[]) => {
  let state = loadAttendanceDemo();
  const original = state;
  for (const approval of approvals) {
    if (approval.type === '补卡审批' || approval.type === '考勤异常申诉审批') {
      state = applyAttendanceApprovalResult(state, approval.code, approval.status);
    } else if (approval.type === '请假审批') {
      state = applyLeaveApprovalResult(state, approval.code, approval.status);
    }
  }
  if (state !== original) saveAttendanceDemo(state);
  return state;
};
