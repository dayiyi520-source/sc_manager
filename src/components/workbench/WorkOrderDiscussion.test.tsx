// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkOrderDiscussion } from './WorkOrderDiscussion';
import type { RequirementEvent } from '../../types';

afterEach(cleanup);
const events: RequirementEvent[] = Array.from({ length: 5 }, (_, index) => ({ id: `comment-${index}`, eventType: '发表评论', operatorName: '讨论者', createdAt: `2026-10-10T10:00:0${index}`, metadata: { commentContent: `评论正文${index}` } }));
const props = { events, open: false, targetId: '', onOpen: vi.fn(), onClose: vi.fn(), onSubmit: vi.fn(), formatTime: (value: string) => value };

describe('事项讨论', () => {
  it('仅展示最近三条，完整列表保留全部正文', () => {
    const { rerender } = render(<WorkOrderDiscussion {...props} />);
    const preview = within(screen.getByLabelText('最近评论'));
    expect(preview.getAllByRole('article')).toHaveLength(3);
    expect(preview.queryByText('评论正文0')).not.toBeInTheDocument();
    expect(preview.getAllByRole('article')[0]).toHaveTextContent('评论正文4');
    fireEvent.click(screen.getByRole('button', { name: '查看全部评论' }));
    expect(props.onOpen).toHaveBeenCalled();
    rerender(<WorkOrderDiscussion {...props} open />);
    expect(within(screen.getByLabelText('全部评论列表')).getAllByRole('article')).toHaveLength(5);
  });

  it('失败保留草稿和提交标识，重试成功清空，不提交空白', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce(undefined);
    render(<WorkOrderDiscussion {...props} events={[]} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('评论内容'), { target: { value: '  ' } });
    expect(screen.getByRole('button', { name: '发表评论' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('评论内容'), { target: { value: ' 保留的草稿 ' } });
    fireEvent.click(screen.getByRole('button', { name: '发表评论' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '发表评论' })).toBeEnabled());
    expect(screen.getByLabelText('评论内容')).toHaveValue(' 保留的草稿 ');
    fireEvent.submit(screen.getByLabelText('评论内容').closest('form')!);
    await waitFor(() => expect(screen.getByLabelText('评论内容')).toHaveValue(''));
    expect(onSubmit.mock.calls[0]).toEqual(onSubmit.mock.calls[1]);
    expect(onSubmit.mock.calls[0][0]).toBe('保留的草稿');
  });
});
