// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalTemplateEditor } from './GoalTemplateEditor';
const categories = [{ id: 'uncategorized', name: '未分类' }, { id: 'company', name: '公司层面' }];
describe('目标模板编辑器', () => {
  it('keeps input after validation and failed save, then retries the same draft', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('网络断开')).mockResolvedValueOnce(undefined);
    render(<GoalTemplateEditor categories={categories} onSave={onSave} onClose={vi.fn()} onAddCategory={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
    expect(await screen.findByText('目标名称须为 1–200 个字符')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: '模板目标名称' }), { target: { value: '改善交付质量' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'KR1名称' }), { target: { value: '验收全部项目' } });
    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
    expect(await screen.findByText('网络断开')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '模板目标名称' })).toHaveValue('改善交付质量');
    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1][0]).toEqual(onSave.mock.calls[0][0]);
  });
  it('adds and removes result rows while retaining at least one', () => {
    render(<GoalTemplateEditor categories={categories} onSave={vi.fn()} onClose={vi.fn()} onAddCategory={vi.fn()}/>);
    expect(screen.getByRole('button', { name: '删除KR1' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '添加关键结果' }));
    expect(screen.getByRole('textbox', { name: 'KR2名称' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '删除KR2' }));
    expect(screen.queryByRole('textbox', { name: 'KR2名称' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除KR1' })).toBeDisabled();
  });
  it('rejects a duplicate category and preserves the name on creation failure', async () => {
    const add = vi.fn().mockRejectedValueOnce(new Error('分类保存失败'));
    render(<GoalTemplateEditor categories={categories} onSave={vi.fn()} onClose={vi.fn()} onAddCategory={add}/>);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '岗位/分类' }));
    const input = await screen.findByRole('textbox', { name: '新增岗位/分类' });
    fireEvent.change(input, { target: { value: '未分类' } });
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(await screen.findByText('岗位/分类已存在')).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: '新增岗位/分类' }), { target: { value: '研发岗位' } });
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(await screen.findByText('分类保存失败')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新增岗位/分类' })).toHaveValue('研发岗位');
  });
});
