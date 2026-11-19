// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AccountsPayableManagementView } from './AccountsPayableManagementView';

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    addToast, currentUser: { name: '测试用户' },
    projects: [
      { id: 'project-1', code: 'P-001', name: '测试项目', customerId: 'customer-1', customerName: '测试客户', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' },
      { id: 'project-2', code: 'P-002', name: '在线精品课程资源库建设项目', customerId: 'customer-2', customerName: '演示学校一', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' },
      { id: 'project-3', code: 'P-003', name: '智慧实训基地升级项目', customerId: 'customer-3', customerName: '演示学校二', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' }
    ],
    contracts: [{ id: 'contract-1', code: 'CT-001', name: '分成合同', customerId: 'customer-1', customerName: '测试客户', relatedProduct: '测试项目', type: '代理合作协议', amount: 2000, signDate: '', status: '履行中' }]
  })
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

it('loads payable demo data and switches to payment records', () => {
  render(<AccountsPayableManagementView />);
  expect(screen.getByText('应付总额')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '付款类型' })).toBeInTheDocument();
  expect(screen.getByText('AP-DEMO-2026-001')).toBeInTheDocument();
  expect(screen.queryByText('AP-DEMO-2026-003')).not.toBeInTheDocument();
  expect(screen.getByText('逾期应付款')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '付款记录' }));
  expect(screen.getByText('APP-DEMO-2026-001')).toBeInTheDocument();
});

it('creates a payable and records a partial payment persistently', () => {
  render(<AccountsPayableManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建付款计划' }));
  const createDialog = screen.getByRole('dialog');
  const customerField = within(createDialog).getByLabelText('收款客户');
  expect(customerField).toHaveValue('');
  fireEvent.change(within(createDialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  expect(customerField).toHaveValue('测试客户');
  expect(customerField).toHaveAttribute('readonly');
  fireEvent.change(within(createDialog).getByLabelText('关联项目'), { target: { value: 'project-2' } });
  expect(customerField).toHaveValue('演示学校一');
  fireEvent.change(within(createDialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  fireEvent.change(within(createDialog).getByLabelText('含税应付金额 (元)'), { target: { value: '1000' } });
  fireEvent.change(within(createDialog).getByLabelText('计划付款日期'), { target: { value: '2026-12-01' } });
  fireEvent.click(within(createDialog).getByRole('button', { name: '保存付款计划' }));
  expect(screen.getAllByText('测试客户').length).toBeGreaterThan(0);
  const row = screen.getAllByText('测试客户').find((element) => element.closest('tr'))?.closest('tr');
  expect(row).toBeTruthy();
  fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '登记付款' }));
  const paymentDialog = screen.getByRole('dialog');
  fireEvent.change(within(paymentDialog).getByLabelText('本次付款金额 (元)'), { target: { value: '400' } });
  fireEvent.click(within(paymentDialog).getByRole('button', { name: '确认登记付款' }));
  expect(screen.getByText('¥ 600')).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem('shichuang.frontend.mock.accountsPayable') || '{}');
  expect(saved.payments).toHaveLength(3);
  expect(saved.payables.find((item: { supplierName: string }) => item.supplierName === '测试客户')).toMatchObject({ supplierName: '测试客户', customerId: 'customer-1', customerName: '测试客户', paidAmount: 400, unpaidAmount: 600 });
});

it('requires a project and a contract for agency sharing payables', () => {
  render(<AccountsPayableManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建付款计划' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByLabelText('付款类型')).toHaveValue('第三方采购');
  expect([...within(dialog).getByLabelText('付款类型').querySelectorAll('option')].slice(1).map(option => option.textContent)).toEqual(['运营中心分成', '投标报名费', '投标保证金', '中标服务费', '专家评审费', '投标平台服务费', '履约保证金', '质保金', '第三方采购']);
  fireEvent.change(within(dialog).getByLabelText('付款类型'), { target: { value: '运营中心分成' } });
  expect(within(dialog).getByLabelText('关联项目')).toBeRequired();
  expect(within(dialog).getByLabelText('关联合同')).toBeRequired();
  fireEvent.change(within(dialog).getByLabelText('付款类型'), { target: { value: '投标报名费' } });
  expect(within(dialog).getByLabelText('关联合同')).not.toBeRequired();
});
