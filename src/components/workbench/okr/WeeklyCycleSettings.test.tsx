// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WeeklyCycleSettings } from './WeeklyCycleSettings';
const cycle = { id: 'w', month: '2026-10', startDate: '2026-10-01', endDate: '2026-10-07', template: 'employee' as const, notifyAt: '2026-10-05T09:00', deadline: '2026-10-07T18:00', allowBackfill: true };
afterEach(() => { cleanup(); vi.useRealTimers(); window.sessionStorage.clear(); });
it('locks begun and ended cycles but permits future edits', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  render(<WeeklyCycleSettings rows={[cycle, { ...cycle, id: 'active', startDate: '2026-10-13', endDate: '2026-10-19' }, { ...cycle, id: 'future', startDate: '2026-10-20', endDate: '2026-10-26' }]} disabled={false} onChange={vi.fn()}/>);
  for (const status of ['已结束', '进行中']) {
    const row = screen.getByText(status).closest('tr')!;
    expect(within(row).getByRole('button', { name: '修改' })).toBeDisabled();
    expect(within(row).getByRole('button', { name: '删除' })).toBeDisabled();
  }
  expect(within(screen.getByText('未开始').closest('tr')!).getByRole('button', { name: '修改' })).toBeEnabled();
});
it('adds a validated future cycle without changing existing rows', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  const onChange = vi.fn(); render(<WeeklyCycleSettings rows={[]} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button', { name: '增加周期' }));
  fireEvent.change(screen.getByLabelText('周期标题'), { target: { value: '十月第三周' } });
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  expect(screen.queryByText('周报模板')).not.toBeInTheDocument();
  await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ title: '十月第三周', month: '2026-10', startDate: '2026-10-16', endDate: '2026-10-22' })]));
  expect(onChange.mock.calls[0][0][0]).not.toHaveProperty('template');
});

it('hides the legacy template in both the list and edit form', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-01T12:00:00'));
  render(<WeeklyCycleSettings rows={[{ ...cycle, startDate: '2026-10-20', endDate: '2026-10-26' }]} disabled={false} onChange={vi.fn()}/>);
  expect(screen.queryByRole('columnheader', { name: '周报模板' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '修改' }));
  expect(screen.queryByText('周报模板')).not.toBeInTheDocument();
});

it('requires a nonblank title before saving a new cycle', async () => {
  const onChange = vi.fn(); render(<WeeklyCycleSettings rows={[]} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button', { name: '增加周期' }));
  fireEvent.change(screen.getByLabelText('周期标题'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  await vi.waitFor(() => expect(screen.getByText('请输入标题')).toBeInTheDocument());
  expect(onChange).not.toHaveBeenCalled();
});
