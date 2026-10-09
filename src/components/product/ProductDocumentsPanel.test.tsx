// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductDocumentsPanel } from './ProductDocumentsPanel';
import type { ProductLine } from '../../types';

const { updateProductLine } = vi.hoisted(() => ({ updateProductLine: vi.fn() }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ currentUser: { name: '测试成员' }, updateProductLine }) }));
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return { ...actual, Modal: ({ open, children, footer }: { open: boolean; children: React.ReactNode; footer: React.ReactNode }) => open ? <div role="dialog">{children}{footer}</div> : null };
});
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: ({ htmlValue, onInput }: { htmlValue: string; onInput: (text: string, html: string) => void }) => <textarea aria-label="文档正文" value={htmlValue} onChange={(event) => onInput(event.target.value, event.target.value)} /> }));

describe('product document save recovery', () => {
  it('keeps the draft open after a failed save and retries the same content', async () => {
    updateProductLine.mockRejectedValueOnce(new Error('存储失败')).mockResolvedValueOnce(undefined);
    render(<ProductDocumentsPanel productLine={{ id: 'line', name: '产品', code: 'p', description: '' } as ProductLine} />);
    fireEvent.click(screen.getByRole('button', { name: '在线新建' }));
    fireEvent.change(screen.getByPlaceholderText('请输入文档名称'), { target: { value: '产品介绍草稿' } });
    fireEvent.change(await screen.findByLabelText('文档正文'), { target: { value: '<p>保留正文</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /保存文档/ }));
    await screen.findByText('存储失败');
    expect((screen.getByPlaceholderText('请输入文档名称') as HTMLInputElement).value).toBe('产品介绍草稿');
    expect((screen.getByLabelText('文档正文') as HTMLTextAreaElement).value).toBe('<p>保留正文</p>');
    await waitFor(() => expect(screen.getByRole('button', { name: /保存文档/ }).classList.contains('ant-btn-loading')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: /保存文档/ }));
    await waitFor(() => expect(updateProductLine).toHaveBeenCalledTimes(2));
    expect(updateProductLine.mock.calls[1][1].documents.introduction).toMatchObject({ name: '产品介绍草稿.html', html: '<p>保留正文</p>', source: 'online' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
