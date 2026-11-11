// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AccountsPayableManagementView } from './AccountsPayableManagementView';

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ addToast, currentUser: { name: '测试用户' } })
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

it('loads payable demo data and switches to payment records', () => {
  render(<AccountsPayableManagementView />);
  expect(screen.getByText('应付账款总额')).toBeInTheDocument();
  expect(screen.getByText('AP-DEMO-2026-001')).toBeInTheDocument();
  expect(screen.getByText('逾期应付款')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '付款记录' }));
  expect(screen.getByText('APP-DEMO-2026-001')).toBeInTheDocument();
});

it('creates a payable and records a partial payment persistently', () => {
  render(<AccountsPayableManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建应付账款' }));
  const createDialog = screen.getByRole('dialog');
  fireEvent.change(within(createDialog).getByLabelText('供应商名称'), { target: { value: '测试供应商' } });
  fireEvent.change(within(createDialog).getByLabelText('含税应付金额 (元)'), { target: { value: '1000' } });
  fireEvent.change(within(createDialog).getByLabelText('计划付款日期'), { target: { value: '2026-12-01' } });
  fireEvent.click(within(createDialog).getByRole('button', { name: '保存应付账款' }));
  expect(screen.getByText('测试供应商')).toBeInTheDocument();
  const row = screen.getByText('测试供应商').closest('tr');
  expect(row).toBeTruthy();
  fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '登记付款' }));
  const paymentDialog = screen.getByRole('dialog');
  fireEvent.change(within(paymentDialog).getByLabelText('本次付款金额 (元)'), { target: { value: '400' } });
  fireEvent.click(within(paymentDialog).getByRole('button', { name: '确认登记付款' }));
  expect(screen.getByText('¥ 600')).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem('shichuang.frontend.mock.accountsPayable') || '{}');
  expect(saved.payments).toHaveLength(2);
  expect(saved.payables.find((item: { supplierName: string }) => item.supplierName === '测试供应商')).toMatchObject({ paidAmount: 400, unpaidAmount: 600 });
});
