// @vitest-environment jsdom
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalTemplateCenter } from './GoalTemplateCenter';
import { goalTemplateRepository, type GoalTemplate } from '../../../services/goalTemplateRepository';
const template: GoalTemplate = { id: 'one', title: '改善交付质量', categoryId: 'company', description: '交付团队使用', source: 'enterprise', creatorId: 'owner', usageCount: 2, version: 1, keyResults: [{ id: 'kr', title: '完成验收清单', confidence: 5, weight: 100, currentValue: 0, targetValue: 100 }] };
const catalog = { categories: [{ id: 'uncategorized', name: '未分类' }, { id: 'company', name: '公司层面' }], templates: [template] };
function setup(viewerId = 'owner') {
  const onUse = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><GoalTemplateCenter open viewerId={viewerId} administrator={false} onClose={vi.fn()} onUse={onUse}/></QueryClientProvider>);
  return { onUse };
}
afterEach(() => vi.restoreAllMocks());
describe('目标模板中心', () => {
  it('filters categories, shows recommended empty state and imports a template', async () => {
    vi.spyOn(goalTemplateRepository, 'catalog').mockResolvedValue(catalog);
    vi.spyOn(goalTemplateRepository, 'use').mockResolvedValue({ ...template, usageCount: 3 });
    const { onUse } = setup();
    expect(await screen.findByText('改善交付质量')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '未分类' }));
    expect(screen.getByText('当前岗位/分类暂无模板')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    fireEvent.click(screen.getByRole('tab', { name: '推荐模板' }));
    expect(screen.getByText('暂无推荐模板')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新建模板' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '企业模板' }));
    fireEvent.click(screen.getByRole('button', { name: '引用 2' }));
    await waitFor(() => expect(onUse).toHaveBeenCalledTimes(1));
    expect(onUse.mock.calls[0][0]).toMatchObject({ title: template.title, keyResults: [{ title: '完成验收清单', progress: 0 }] });
  });
  it('offers retry after loading fails and hides edit controls for other creators', async () => {
    vi.spyOn(goalTemplateRepository, 'catalog').mockRejectedValueOnce(new Error('网络断开')).mockResolvedValue(catalog);
    setup('another');
    expect(await screen.findByText('模板加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('改善交付质量')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑模板：改善交付质量' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除模板：改善交付质量' })).not.toBeInTheDocument();
  });
  it('deletes only after confirmation and preserves the dialog on failure', async () => {
    vi.spyOn(goalTemplateRepository, 'catalog').mockResolvedValue(catalog);
    const remove = vi.spyOn(goalTemplateRepository, 'remove').mockRejectedValue(new Error('删除失败'));
    setup();
    await screen.findByText('改善交付质量');
    fireEvent.click(screen.getByRole('button', { name: '删除模板：改善交付质量' }));
    expect(remove).not.toHaveBeenCalled();
    // Ant Design uses the same test-id for nested dialog titles in test mode.
    const title = await screen.findByText('删除模板', { selector: '.ant-modal-title' });
    const dialog = title.closest('[role=dialog]') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /删\s*除/ }));
    expect(await within(dialog).findByText('删除失败')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
    expect(screen.getByText('改善交付质量')).toBeInTheDocument();
  });
});
