// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import type { ProductLine } from '../../types';
import { PresalesCenterView } from './PresalesCenterView';

const state = vi.hoisted(() => ({ role: 'admin', products: [] as ProductLine[] }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ currentUser: { role: state.role }, productLines: state.products }),
}));
beforeEach(() => {
  localStorage.clear();
  state.role = 'admin';
  state.products = [
    { id: 'a', name: '原始产品A', description: '产品说明', commercialAvailability: '可商用' },
    { id: 'b', name: '原始产品B', commercialAvailability: '可销售' },
    { id: 'c', name: '不可售产品', commercialAvailability: '不可商用' },
  ] as ProductLine[];
});

describe('售前中心页面', () => {
  it('shows six categories and only saleable products', () => {
    render(<PresalesCenterView />);
    expect(screen.getAllByRole('button', { name: /新人指引|政策文件|销售话术|价格体系|资质文件|其他文件/ })).toHaveLength(6);
    expect(screen.getByText('原始产品A')).toBeInTheDocument();
    expect(screen.getByText('原始产品B')).toBeInTheDocument();
    expect(screen.queryByText('不可售产品')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '排序设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下载日志' })).toBeInTheDocument();
  });

  it('saves category edits and product alias without changing the source product', () => {
    const { unmount } = render(<PresalesCenterView />);
    fireEvent.click(screen.getByRole('button', { name: '排序设置' }));
    expect(screen.queryByRole('button', { name: /^上移|^下移/ })).not.toBeInTheDocument();
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'none', dropEffect: 'none' };
    const firstCategory = screen.getByRole('button', { name: '拖动新人指引' }).closest('.presales-setting-row') as HTMLElement;
    fireEvent.dragStart(screen.getByRole('button', { name: '拖动政策文件' }), { dataTransfer });
    fireEvent.dragOver(firstCategory, { dataTransfer, clientY: 0 });
    fireEvent.drop(firstCategory, { dataTransfer, clientY: 0 });
    fireEvent.change(screen.getAllByRole('textbox', { name: '分类名称' })[0], { target: { value: '售前入门' } });
    fireEvent.change(screen.getAllByRole('textbox', { name: '分类描述' })[0], { target: { value: '入门材料' } });
    fireEvent.change(within(screen.getByText('原始产品A').closest('.presales-setting-row') as HTMLElement).getByRole('textbox', { name: '售前展示别名' }), { target: { value: '售前别名A' } });
    const firstProduct = screen.getByRole('button', { name: '拖动原始产品A' }).closest('.presales-setting-row') as HTMLElement;
    fireEvent.dragStart(screen.getByRole('button', { name: '拖动原始产品B' }), { dataTransfer });
    fireEvent.dragOver(firstProduct, { dataTransfer, clientY: 0 });
    fireEvent.drop(firstProduct, { dataTransfer, clientY: 0 });
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));
    expect(screen.getByText('售前别名A')).toBeInTheDocument();
    expect(screen.getAllByRole('article').map(item => item.textContent?.includes('售前别名A'))).toEqual([false, true]);
    expect(screen.getByText('产品名称：原始产品A')).toBeInTheDocument();
    expect(state.products[0].name).toBe('原始产品A');
    unmount();
    render(<PresalesCenterView />);
    expect(screen.getByText('售前别名A')).toBeInTheDocument();
    expect(screen.getByText('产品名称：原始产品A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /售前入门/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /售前入门|新人指引/ }).map(item => item.textContent?.trim())).toEqual(['售前入门入门材料', '新人指引快速了解平台功能']);
  });

  it('does not expose configuration to non-admins', () => {
    state.role = 'sales_director';
    render(<PresalesCenterView />);
    expect(screen.queryByRole('button', { name: '排序设置' })).not.toBeInTheDocument();
  });

  it('drags the last category and thirtieth product directly to the top and persists both', () => {
    state.products = Array.from({ length: 30 }, (_, index) => ({
      id: `product-${index}`, name: `产品${index + 1}`, sort: index, commercialAvailability: '可销售',
    })) as ProductLine[];
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'none', dropEffect: 'none' };
    const { unmount } = render(<PresalesCenterView />);
    fireEvent.click(screen.getByRole('button', { name: '排序设置' }));
    const firstCategory = screen.getByRole('button', { name: '拖动新人指引' }).closest('.presales-setting-row') as HTMLElement;
    fireEvent.dragStart(screen.getByRole('button', { name: '拖动其他文件' }), { dataTransfer });
    fireEvent.dragOver(firstCategory, { dataTransfer, clientY: 0 });
    fireEvent.drop(firstCategory, { dataTransfer, clientY: 0 });
    const firstProduct = screen.getByRole('button', { name: '拖动产品1' }).closest('.presales-setting-row') as HTMLElement;
    const productList = firstProduct.parentElement as HTMLElement;
    productList.scrollTop = 500;
    vi.spyOn(productList, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 600, height: 600 } as DOMRect);
    fireEvent.dragStart(screen.getByRole('button', { name: '拖动产品30' }), { dataTransfer });
    const scrollEvent = createEvent.dragOver(productList, { dataTransfer });
    Object.defineProperty(scrollEvent, 'clientY', { value: 4 });
    fireEvent(productList, scrollEvent);
    expect(productList.scrollTop).toBe(468);
    fireEvent.dragOver(firstProduct, { dataTransfer, clientY: 0 });
    fireEvent.drop(firstProduct, { dataTransfer, clientY: 0 });
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('产品30');
    expect(screen.getAllByRole('button', { name: /新人指引|其他文件/ })[0]).toHaveTextContent('其他文件');
    unmount();
    render(<PresalesCenterView />);
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('产品30');
    expect(screen.getAllByRole('button', { name: /新人指引|其他文件/ })[0]).toHaveTextContent('其他文件');
  });

  it('does not overwrite an unreadable saved configuration', () => {
    localStorage.setItem('crm.presales-center.v1', '{broken');
    render(<PresalesCenterView />);
    expect(screen.getByText(/原数据已保留/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '排序设置' })).toBeDisabled();
    expect(localStorage.getItem('crm.presales-center.v1')).toBe('{broken');
  });
});
