// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalCenterView } from './ApprovalCenterView';
import { MOCK_APPROVALS, MOCK_USERS } from '../../data/mockSnapshot';
import { pendingFor, reviewedBy } from '../workbench/workbenchListRules';

const { appState } = vi.hoisted(() => ({
  appState: {
    approvals: [
      { id: 'one', code: 'AP-1', title: '合同审批一', type: '合同用印审批', applicantName: '申请人甲', applicantDept: '商务部', status: '待审批', ccNames: ['当前用户'], submittedAt: '2026-11-09 09:00', nodes: [{ title: '部门审核', approver: '当前用户', role: '主管', status: 'current' }], contentDetails: { 说明: '演示内容' } },
      { id: 'two', code: 'AP-2', title: '采购审批二', type: '采购与报销', applicantName: '当前用户', applicantDept: '研发部', status: '审批中', ccNames: [], submittedAt: '2026-11-08 09:00', nodes: [{ title: '财务审核', approver: '其他人', role: '财务', status: 'current' }], contentDetails: { 说明: '另一条记录' } },
      { id: 'three', code: 'AP-3', title: '完成审批三', type: '合作伙伴准入', applicantName: '申请人甲', applicantDept: '商务部', status: '已完成', submittedAt: '2026-11-07 09:00', completedAt: '2026-11-07 11:00', nodes: [{ title: '终审', approver: '当前用户', role: '主管', status: 'passed' }], contentDetails: {} },
      { id: 'four', code: 'AP-4', title: '节点缺失边界记录', type: '合作伙伴准入', applicantName: '申请人乙', applicantDept: '研发部', status: '已驳回', submittedAt: '2026-11-06 09:00', nodes: [], contentDetails: {} },
    ],
    currentUser: { id: 'user-1', name: '当前用户' },
    selectedApprovalIdForDetail: null as string | null,
    setSelectedApprovalIdForDetail: vi.fn((id: string | null) => { appState.selectedApprovalIdForDetail = id; }),
  },
}));

vi.mock('../../context/AppContext', async () => {
  const ReactModule = await import('react');
  return { useApp: () => {
    const [selectedApprovalIdForDetail, setSelectedApprovalIdForDetail] = ReactModule.useState(null as string | null);
    return { ...appState, selectedApprovalIdForDetail, setSelectedApprovalIdForDetail };
  } };
});
vi.mock('../comprehensive/ComprehensivePage', () => ({ ComprehensivePage: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../common/UIComponents', () => ({
  StatCard: ({ title, value }: { title: string; value: string }) => <div data-testid="metric-card"><span>{title}</span><b>{value}</b></div>,
  StatusTag: ({ status }: { status: string }) => <span>{status}</span>,
  Drawer: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: React.ReactNode }) => isOpen ? <aside role="dialog"><div>{title}</div>{children}</aside> : null,
}));

afterEach(cleanup);
beforeEach(() => { appState.selectedApprovalIdForDetail = null; appState.setSelectedApprovalIdForDetail.mockClear(); });

describe('ApprovalCenterView', () => {
  it('shows the four requested metrics and tabs in order without approval actions', () => {
    render(<ApprovalCenterView />);

    expect(screen.getAllByTestId('metric-card').map(card => card.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringContaining('今日发起'), expect.stringContaining('审批中'), expect.stringContaining('已审批'), expect.stringContaining('审批平均耗时'),
    ]);
    const tabs = within(screen.getByRole('group', { name: '审批分类' })).getAllByRole('button').map(button => button.textContent?.replace(/\s+/g, ' ').trim());
    expect(tabs).toEqual(['待我审批1', '我发起的', '抄送我的', '我已审批', '全部']);
    expect(screen.getByRole('button', { name: /待我审批/ })).toHaveClass('is-active');
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    expect(screen.getByRole('button', { name: '全部' })).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: /待我审批/ })).not.toHaveClass('is-active');
    expect(screen.queryByRole('columnheader', { name: '操作' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '同意' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '驳回' })).not.toBeInTheDocument();
  });

  it('shows the current approval node, spans seven columns when empty, and retains detail content', () => {
    render(<ApprovalCenterView />);
    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      '审批单号', '审批事项与主题', '审批类型', '当前节点', '申请人 / 部门', '申请时间', '当前状态',
    ]);
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    expect(screen.getByText('AP-1').closest('tr')?.querySelectorAll('td')).toHaveLength(7);
    expect(screen.getByText('AP-1').closest('tr')?.querySelectorAll('td')[3]).toHaveTextContent('部门审核');
    expect(screen.getByText('AP-3').closest('tr')?.querySelectorAll('td')[3]).toHaveTextContent('已完成');
    expect(screen.getByText('AP-4').closest('tr')?.querySelectorAll('td')[3]).toHaveTextContent('—');
    fireEvent.click(screen.getByText('AP-1').closest('tr')!);
    expect(within(screen.getByRole('dialog')).getByText('演示内容')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索审批单号、主题或关联内容'), { target: { value: '不存在的审批单' } });
    expect(screen.getByText('暂无符合条件的审批流转记录').closest('td')).toHaveAttribute('colspan', '7');
  });

  it('has mock records available in every approval category tab', () => {
    render(<ApprovalCenterView />);
    const categories = [
      ['待我审批', /待我审批/],
      ['我发起的', '我发起的'],
      ['抄送我的', '抄送我的'],
      ['我已审批', '我已审批'],
      ['全部', '全部'],
    ] as const;

    for (const [label, accessibleName] of categories) {
      fireEvent.click(screen.getByRole('button', { name: accessibleName }));
      const rows = document.querySelectorAll('.approval-center tbody tr');
      expect(rows.length, `${label} 应有演示审批记录`).toBeGreaterThan(0);
      expect(rows[0]).not.toHaveTextContent('暂无符合条件的审批流转记录');
    }
  });

  it('seeds approval examples for every category in the default user view', () => {
    const currentUserName = MOCK_USERS[0]?.name;
    expect(currentUserName).toBeTruthy();
    expect(MOCK_APPROVALS.some(flow => pendingFor(flow, currentUserName!))).toBe(true);
    expect(MOCK_APPROVALS.some(flow => flow.applicantName === currentUserName)).toBe(true);
    expect(MOCK_APPROVALS.some(flow => flow.ccNames?.includes(currentUserName!))).toBe(true);
    expect(MOCK_APPROVALS.some(flow => reviewedBy(flow, currentUserName!))).toBe(true);
    expect(MOCK_APPROVALS.length).toBeGreaterThan(0);
  });

  it('filters by applicant and the four display statuses, and keeps details read-only', () => {
    render(<ApprovalCenterView />);
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    fireEvent.change(screen.getByLabelText('申请人筛选'), { target: { value: '申请人甲' } });
    expect(screen.getByText('AP-1')).toBeInTheDocument();
    expect(screen.getByText('AP-3')).toBeInTheDocument();
    expect(screen.queryByText('AP-2')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('审批状态筛选'), { target: { value: '已完成' } });
    expect(screen.queryByText('AP-1')).not.toBeInTheDocument();
    expect(screen.getByText('AP-3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('AP-3').closest('tr')!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /同意审批|驳回申请/ })).not.toBeInTheDocument();
  });
});
