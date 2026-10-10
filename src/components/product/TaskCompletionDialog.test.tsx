// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Modal } from 'antd';
import { openTaskCompletionDialog, validCompletionHours } from './TaskCompletionDialog';

beforeEach(() => {
  vi.spyOn(Modal, 'confirm').mockImplementation((configuration) => {
    const view = render(<>{configuration.content}</>);
    return { destroy: () => view.unmount(), update: vi.fn() };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('validates nonnegative hours with at most two decimal places', () => {
  for (const value of [null, -1, Infinity, 1.001, 100000000]) expect(validCompletionHours(value)).toBe(false);
  for (const value of [0, 0.01, 8, 12.34]) expect(validCompletionHours(value)).toBe(true);
});

it('cancels completion without writing', async () => {
  const save = vi.fn();
  await act(async () => { openTaskCompletionDialog(save); });
  fireEvent.click(await screen.findByRole('button', { name: '取 消' }));
  expect(save).not.toHaveBeenCalled();
});

it('requires hours and retains input after save failure for retry', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('网络连接失败')).mockResolvedValueOnce(undefined);
  await act(async () => { openTaskCompletionDialog(save); });
  fireEvent.click(await screen.findByRole('button', { name: '确认完成' }));
  expect(await screen.findByText('请填写非负且最多两位小数的完成工时')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3.25' } });
  fireEvent.click(screen.getByRole('button', { name: /确认完成/ }));
  expect(await screen.findByText('网络连接失败')).toBeTruthy();
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('3.25');
  fireEvent.click(await screen.findByRole('button', { name: /确认完成/ }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save).toHaveBeenLastCalledWith(3.25, '', { content: '', media: [] });
});

it('saves review text and attachments together with hours', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  await act(async () => { openTaskCompletionDialog(save); });
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
  fireEvent.change(screen.getByRole('textbox', { name: '复盘总结' }), { target: { value: '完成验证，补充回归用例' } });
  const file = new File(['verification'], '复盘.txt', { type: 'text/plain' });
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
  expect(await screen.findByText('复盘.txt')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /确认完成/ }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(2, '', { content: '完成验证，补充回归用例', media: [expect.objectContaining({ name: '复盘.txt', dataUrl: expect.stringMatching(/^data:text\/plain;base64,/) })] }));
});

it('accepts an attachment without a detected MIME type', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  await act(async () => { openTaskCompletionDialog(save); });
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['ok'], '复盘.custom')] } });
  expect(await screen.findByText('复盘.custom')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /确认完成/ }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(1, '', { content: '', media: [expect.objectContaining({ dataUrl: expect.stringMatching(/^data:application\/octet-stream;base64,/) })] }));
});
