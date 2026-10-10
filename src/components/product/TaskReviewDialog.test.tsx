// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskReviewDialog } from './TaskReviewDialog';
import { productRepository } from '../../services/productRepository';

vi.mock('../../services/productRepository', () => ({ productRepository: { workItemReview: vi.fn(), saveWorkItemReview: vi.fn() } }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: ({ value, htmlValue, onInput, readOnly }: { value: string; htmlValue: string; readOnly: boolean; onInput: (text: string, html: string) => void }) => <div><textarea aria-label="复盘内容" value={value} disabled={readOnly} onChange={(event) => onInput(event.target.value, `<p>${event.target.value}</p>`)} /><span data-testid="saved-html">{htmlValue}</span></div> }));
const task = { id: 'task-1', productLineId: 'line-1', title: '产品任务' };
const saved = { title: '已保存复盘', content: '经验', contentHtml: '<p>经验<img src="data:image/png;base64,YQ=="></p>', media: [{ id: 'file-1', name: '复盘附件.txt', type: 'file' as const, dataUrl: 'data:text/plain;base64,YQ==' }], revision: 1 };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(productRepository.workItemReview).mockResolvedValue(null); vi.mocked(productRepository.saveWorkItemReview).mockResolvedValue(saved); });
afterEach(cleanup);

it('回显标题、富文本图片与附件；失败保留输入，重试后关闭', async () => {
  vi.mocked(productRepository.workItemReview).mockResolvedValue(saved);
  vi.mocked(productRepository.saveWorkItemReview).mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({ ...saved, title: '更新的复盘', revision: 2 });
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<TaskReviewDialog task={task} onClose={onClose} onSaved={onSaved} />);
  await waitFor(() => expect(screen.getByLabelText('复盘总结标题')).toHaveValue(saved.title));
  expect(screen.getByTestId('saved-html')).toHaveTextContent('data:image/png');
  expect(screen.getByText('复盘附件.txt')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('复盘总结标题'), { target: { value: '更新的复盘' } });
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  expect(await screen.findByText('保存失败')).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText('复盘总结标题')).toHaveValue('更新的复盘');
  await waitFor(() => expect(screen.getByRole('button', { name: /保\s*存/ })).not.toHaveTextContent('loading'));
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(productRepository.saveWorkItemReview).toHaveBeenLastCalledWith('line-1', 'task-1', { ...saved, title: '更新的复盘' });
});

it('加载失败禁止覆盖；重试成功后可编辑', async () => {
  vi.mocked(productRepository.workItemReview).mockRejectedValueOnce(new Error('网络中断')).mockResolvedValueOnce(saved);
  render(<TaskReviewDialog task={task} onClose={vi.fn()} />);
  expect(await screen.findByText('网络中断')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /保\s*存/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '重 试' }));
  await waitFor(() => expect(screen.getByLabelText('复盘总结标题')).toHaveValue(saved.title));
  expect(productRepository.saveWorkItemReview).not.toHaveBeenCalled();
});

it('空标题阻止保存；保存中重复点击只写一次', async () => {
  let resolve!: (value: typeof saved) => void;
  vi.mocked(productRepository.saveWorkItemReview).mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<TaskReviewDialog task={task} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByLabelText('复盘总结标题')).toHaveValue('产品任务复盘总结'));
  fireEvent.change(screen.getByLabelText('复盘总结标题'), { target: { value: ' ' } });
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  expect(productRepository.saveWorkItemReview).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('复盘总结标题'), { target: { value: '有效标题' } });
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  expect(productRepository.saveWorkItemReview).toHaveBeenCalledTimes(1);
  resolve(saved);
  await waitFor(() => expect(screen.getByText('复盘总结已保存')).toBeInTheDocument());
});
