// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProcurementManagementView } from './ProcurementManagementView';

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    addToast,
    projects: [{ id: 'project-1', name: '智慧校园项目', customerId: 'customer-1', customerName: '测试学校' }]
  })
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

it('counts and lists only purchases linked to current projects, and keeps only procurement entry surfaces', () => {
  localStorage.setItem('shichuang.frontend.mock.procurementItems', JSON.stringify([
    { id: 'purchase-1', code: 'PO-001', supplier: '供应商甲', description: '项目设备', amount: 1200, status: '待审批', projectId: 'project-1', projectName: '智慧校园项目', customerName: '测试学校' },
    { id: 'purchase-2', code: 'PO-002', supplier: '供应商乙', description: '项目服务', amount: 800, status: '已完成', relatedProject: '智慧校园项目', relatedCustomer: '测试学校' },
    { id: 'legacy-purchase', code: 'PO-GENERAL', supplier: '行政供应商', description: '行政用品', amount: 5000, status: '待审批', relatedProject: '通用项目' },
    { id: 'removed-project-purchase', code: 'PO-OLD', supplier: '旧供应商', description: '旧项目商品', amount: 2000, status: '待审批', projectId: 'deleted-project', relatedProject: '已删除项目' }
  ]));

  render(<ProcurementManagementView />);

  expect(screen.getByText('2 单')).toBeInTheDocument();
  expect(screen.getByText('¥ 2,000')).toBeInTheDocument();
  expect(screen.getByText('1 件')).toBeInTheDocument();
  const projectCountCard = screen.getByText('关联项目数').closest('.ant-card');
  expect(projectCountCard).toHaveTextContent('1');
  expect(projectCountCard).toHaveTextContent('个');
  expect(screen.getByText('PO-001')).toBeInTheDocument();
  expect(screen.getByText('PO-002')).toBeInTheDocument();
  expect(screen.queryByText('PO-GENERAL')).not.toBeInTheDocument();
  expect(screen.queryByText('PO-OLD')).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '入库登记与资产联动' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新建采购申请' })).not.toBeInTheDocument();

  const approvalEntry = screen.getByRole('button', { name: '发起采购审批' });
  expect(approvalEntry).toHaveClass('bg-[var(--bg-elevated)]');
  expect(approvalEntry).not.toHaveClass('bg-[var(--primary)]');
});

it('requires a project and derives the customer when creating a project purchase', () => {
  localStorage.setItem('shichuang.frontend.mock.procurementItems', '[]');
  render(<ProcurementManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建采购单' }));
  const dialog = screen.getByRole('dialog');
  const projectSelect = within(dialog).getByLabelText('关联项目');
  expect(projectSelect).toBeRequired();
  expect(within(dialog).getByLabelText('关联客户')).toHaveAttribute('readonly');

  fireEvent.change(projectSelect, { target: { value: 'project-1' } });
  expect(within(dialog).getByLabelText('关联客户')).toHaveValue('测试学校');
  fireEvent.change(within(dialog).getByPlaceholderText('如：戴尔(中国)有限公司'), { target: { value: '供应商甲' } });
  fireEvent.change(within(dialog).getByPlaceholderText('如：服务器工作站 / 显示器'), { target: { value: '存储服务器' } });
  fireEvent.change(within(dialog).getByPlaceholderText('例如：25000'), { target: { value: '12000' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '生成采购单' }));

  expect(addToast).toHaveBeenCalledWith('success', '采购单建档成功', expect.stringContaining('单号：PO-'));
  const saved = JSON.parse(localStorage.getItem('shichuang.frontend.mock.procurementItems') || '[]');
  expect(saved[0]).toMatchObject({ projectId: 'project-1', projectName: '智慧校园项目', customerName: '测试学校', relatedProject: '智慧校园项目', relatedCustomer: '测试学校' });
});

it('shows initial project-linked procurement mock rows with an explicit demo marker', () => {
  render(<ProcurementManagementView />);

  expect(screen.getByText('PO-DEMO-INIT-001')).toBeInTheDocument();
  expect(screen.getByText('演示资料')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.procurementItems') || '[]')[0]).toMatchObject({ projectId: 'project-1', isDemo: true });
});
