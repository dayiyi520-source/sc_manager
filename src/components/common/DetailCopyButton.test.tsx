// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DetailCopyButton } from './DetailCopyButton';

it('prevents repeated copies while the clipboard operation is pending', async () => {
  let complete!: () => void;
  const onCopy = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
  render(<DetailCopyButton label="复制任务编号" onCopy={onCopy} />);
  const button = screen.getByRole('button', { name: '复制任务编号' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(onCopy).toHaveBeenCalledOnce();
  await act(async () => complete());
  expect(button).not.toBeDisabled();
});
