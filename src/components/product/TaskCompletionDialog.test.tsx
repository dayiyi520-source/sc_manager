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
  expect(save).toHaveBeenLastCalledWith(3.25, '');
});
