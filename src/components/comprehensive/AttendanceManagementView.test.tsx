// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceManagementView } from './AttendanceManagementView';
import { ATTENDANCE_DEMO_STORAGE_KEY, loadAttendanceDemo } from '../../services/attendanceDemo';

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ addToast: vi.fn(), approvals: [] }) }));
vi.mock('../comprehensive/ComprehensivePage', () => ({ ComprehensivePage: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../common/UIComponents', () => ({
  StatCard: ({ title, value }: { title: string; value: React.ReactNode }) => <div>{title}{value}</div>,
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
  Drawer: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => isOpen ? <aside>{children}</aside> : null,
}));

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('shichuang.frontend.demo.kpiPerformance.v1', JSON.stringify({ periods: { '2026-10': { published: true } } }));
  localStorage.removeItem(ATTENDANCE_DEMO_STORAGE_KEY);
});

describe('AttendanceManagementView', () => {
  it('removes employee number and places leave department after applicant', () => {
    render(<AttendanceManagementView />);
    const attendanceTable = screen.getByRole('table');
    expect(within(attendanceTable).queryByRole('columnheader', { name: '工号' })).not.toBeInTheDocument();
    expect(within(attendanceTable).getAllByText('林知夏')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /请假申请/ }));
    const leaveTable = screen.getByRole('table');
    const headers = within(leaveTable).getAllByRole('columnheader').map(header => header.textContent);
    expect(headers.slice(0, 4)).toEqual(['申请单号', '申请人', '部门', '类型']);
  });

  it('filters leave requests by type, department and search, and persists exception review', () => {
    render(<AttendanceManagementView />);
    fireEvent.click(screen.getByRole('button', { name: /请假申请/ }));
    fireEvent.change(screen.getByLabelText('类型筛选'), { target: { value: '年假' } });
    fireEvent.change(screen.getByLabelText('部门筛选'), { target: { value: '研发部' } });
    const leaveTable = screen.getByRole('table');
    expect(within(leaveTable).getByText('顾清和')).toBeInTheDocument();
    expect(within(leaveTable).queryByText('周予安')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('部门筛选'), { target: { value: 'ALL' } });
    fireEvent.click(screen.getByRole('button', { name: /异常申诉/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认更正' }));
    expect(screen.getAllByText(/AP-ATT-2026-1028/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '确认考勤更正' }));
    expect(loadAttendanceDemo().exceptions.find(item => item.id === 'ex-04')?.correctionStatus).toBe('待HR更正');
    expect(loadAttendanceDemo().attendanceRecords.find(item => item.id === 'att-13')?.status).toBe('缺卡');
  });
});
