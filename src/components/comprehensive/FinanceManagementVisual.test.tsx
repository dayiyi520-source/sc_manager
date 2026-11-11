// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InvoiceManagementView } from './InvoiceManagementView';
import { PaymentCollectionManagementView } from './PaymentCollectionManagementView';

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ addToast: vi.fn() }) }));
afterEach(cleanup);

it('shows all invoice views with official empty states and keeps tax profile entry readable', () => {
  render(<InvoiceManagementView />);
  expect(screen.getByRole('tablist', { name: '发票视图' })).toBeInTheDocument();
  expect(screen.getByText('暂无销项开票申请')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '进项抵扣登记' }));
  expect(screen.getByText('暂无进项抵扣登记')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '开票抬头信息库' }));
  expect(screen.getByText('暂无开票抬头资料')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '录入抬头资料' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: '录入企业开票抬头资质' })).toBeInTheDocument();
  fireEvent.change(within(dialog).getByPlaceholderText('如：南京师创智联科技有限公司'), { target: { value: '测试单位' } });
  fireEvent.change(within(dialog).getByPlaceholderText('18位纳税人识别号'), { target: { value: '123456789012345678' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存资质档案' }));
  const card = screen.getByText('测试单位').closest('.finance-profile');
  expect(card).toHaveTextContent('123456789012345678');
  expect(card).toHaveTextContent('开户银行');
});

it('keeps invoice application entry and list switching', () => {
  render(<InvoiceManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建开票申请' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByPlaceholderText('如：国家电网华东分部'), { target: { value: '测试客户' } });
  fireEvent.change(within(dialog).getByPlaceholderText('例如：500000'), { target: { value: '500000' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '提交财务开票' }));
  expect(screen.getByText('测试客户')).toBeInTheDocument();
  expect(screen.getByText('¥ 500,000')).toBeInTheDocument();
});

it('shows all payment views and preserves the plan and receipt entry flows', () => {
  render(<PaymentCollectionManagementView />);
  expect(screen.getByRole('tablist', { name: '回款视图' })).toBeInTheDocument();
  expect(screen.getByText('暂无回款计划')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '实际到账记录' }));
  expect(screen.getByText('暂无到账记录')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '逾期与催款预警' }));
  expect(screen.getByText('暂无逾期款项')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '新建回款计划' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByPlaceholderText('如：SC-CT-2026-089'), { target: { value: 'SC-CT-1' } });
  fireEvent.change(within(dialog).getByPlaceholderText('如：国家电网'), { target: { value: '测试客户' } });
  fireEvent.change(within(dialog).getByPlaceholderText('100000'), { target: { value: '100000' } });
  fireEvent.change(within(dialog).getByLabelText('约定截止回款日期'), { target: { value: '2026-11-30' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '创建回款计划' }));
  fireEvent.click(screen.getByRole('tab', { name: '回款计划台账' }));
  expect(screen.getByText('测试客户')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '录入到账' }));
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: '确认销账并录入' })).toBeInTheDocument();
});
