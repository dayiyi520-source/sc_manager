// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ProductLine } from '../../types';
import { CompetitorManagementView, type CompetitorRecord } from './CompetitorManagementView';

const state = vi.hoisted(() => ({ products: [] as ProductLine[] }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: state.products }) }));

beforeEach(() => {
  state.products = [
    { id: 'sale', name: '可销售产品', commercialAvailability: '可销售' },
    { id: 'legacy', name: '历史可商用产品', commercialAvailability: '可商用' },
    { id: 'hidden', name: '不可销售产品', commercialAvailability: '不可销售' },
  ] as ProductLine[];
});

const record: CompetitorRecord = {
  id: 'company-1', companyName: '测试企业', registeredCapital: '1000万元', legalRepresentative: '测试法人',
  creatorName: '创建人', createdAt: '2026-11-11 10:00',
  products: [{ id: 'r1', productId: 'sale', competitorProduct: '竞品A', attachments: [{ id: 'a1', name: '资料.pdf' }], link: 'https://example.com/material' }],
  encounters: [{ id: 'bid1', biddingName: '招投标项目', coreProduct: '可销售产品', result: '未中标' }],
};

describe('友商管理界面', () => {
  it('shows eight requested columns and an honest empty state', () => {
    render(<CompetitorManagementView />);
    for (const heading of ['友商名称', '注册资金', '法人', '关联竞品', '交锋项目', '创建人', '创建时间', '编辑操作']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText('暂无友商记录')).toBeInTheDocument();
  });

  it('opens both numeric detail views with the required fields', () => {
    render(<CompetitorManagementView records={[record]} />);
    fireEvent.click(screen.getByRole('button', { name: '查看测试企业的关联竞品' }));
    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('columnheader', { name: '师创产品' })).toBeInTheDocument();
    expect(within(dialog).getByText('竞品A')).toBeInTheDocument();
    expect(within(dialog).getByText('资料.pdf')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: '资料链接' })).toHaveAttribute('href', 'https://example.com/material');
    fireEvent.click(within(dialog).getByRole('button', { name: /关\s*闭/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看测试企业的交锋项目' }));
    dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('columnheader', { name: '招投标项目' })).toBeInTheDocument();
    expect(within(dialog).getByRole('columnheader', { name: '核心产品' })).toBeInTheDocument();
    expect(within(dialog).getByRole('columnheader', { name: '交锋结果' })).toBeInTheDocument();
    expect(within(dialog).getByText('未中标')).toBeInTheDocument();
  });

  it('edits a draft, filters saleable products and never claims a saved record', async () => {
    render(<CompetitorManagementView />);
    fireEvent.click(screen.getByRole('button', { name: '新建友商' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: '友商名称' })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: '注册资金' })).toHaveAttribute('readonly');
    expect(within(dialog).getByRole('textbox', { name: '法人' })).toHaveAttribute('readonly');
    expect(within(dialog).getByRole('button', { name: /保\s*存/ })).toBeDisabled();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: '师创产品' }));
    expect(await screen.findByText('可销售产品', { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
    expect(screen.getByText('历史可商用产品', { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
    expect(screen.queryByText('不可销售产品', { selector: '.ant-select-item-option-content' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('可销售产品', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: '友商产品' }), { target: { value: '竞品名称' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '友商资料链接' }), { target: { value: 'https://example.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '添加竞品' }));
    expect(within(dialog).getAllByRole('textbox', { name: '友商产品' })).toHaveLength(2);
    fireEvent.click(within(dialog).getAllByRole('button', { name: '删除竞品行' })[1]);
    expect(within(dialog).getAllByRole('textbox', { name: '友商产品' })).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
    expect(screen.getByText('暂无友商记录')).toBeInTheDocument();
  });

  it('keeps the product chooser empty when no product is saleable', () => {
    state.products = [{ id: 'hidden', name: '不可销售产品', commercialAvailability: '不可销售' }] as ProductLine[];
    render(<CompetitorManagementView />);
    fireEvent.click(screen.getByRole('button', { name: '新建友商' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '师创产品' }));
    expect(screen.getByText('暂无可销售产品')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保\s*存/ })).toBeDisabled();
  });
});
