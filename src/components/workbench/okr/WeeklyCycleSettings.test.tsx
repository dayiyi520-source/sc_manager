// @vitest-environment jsdom
import { cleanup, fireEvent, render as renderUi, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WeeklyCycleSettings } from './WeeklyCycleSettings';
import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
const render = (ui: ReactNode) => renderUi(<ConfigProvider theme={{ token: { motion: false } }}>{ui}</ConfigProvider>);
const cycle = { id: 'w', month: '2026-10', startDate: '2026-10-01', endDate: '2026-10-07', template: 'employee' as const, notifyAt: '2026-10-05T09:00', deadline: '2026-10-07T18:00', allowBackfill: true };
afterEach(() => { cleanup(); vi.useRealTimers(); window.sessionStorage.clear(); });
it('permits edits for all cycles while keeping begun and ended cycles protected from deletion', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  render(<WeeklyCycleSettings rows={[cycle, { ...cycle, id: 'active', startDate: '2026-10-13', endDate: '2026-10-19' }, { ...cycle, id: 'future', startDate: '2026-10-20', endDate: '2026-10-26' }]} disabled={false} onChange={vi.fn()}/>);
  for (const status of ['已结束', '进行中']) {
    const row = screen.getByText(status).closest('tr')!;
    expect(within(row).getByRole('button', { name: '修改' })).toBeEnabled();
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
  await waitFor(() => expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ title: '十月第三周', month: '2026-10', startDate: '2026-10-16', endDate: '2026-10-22' })]));
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
  await waitFor(() => expect(screen.getByText('请输入标题')).toBeInTheDocument());
  expect(onChange).not.toHaveBeenCalled();
});

it('defaults a new cycle to the selected past month and saves it with backfill enabled', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  window.sessionStorage.setItem('okr.settings.weeklyCycleMonth', '2026-09');
  const onChange = vi.fn().mockResolvedValue(true);
  render(<WeeklyCycleSettings rows={[]} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button', { name: '增加周期' }));
  expect(screen.getByLabelText('开始日期')).toHaveValue('2026-09-01');
  fireEvent.change(screen.getByLabelText('周期标题'), { target: { value: '补建九月周报' } });
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ title: '补建九月周报', month: '2026-09', startDate: '2026-09-01', endDate: '2026-09-07', allowBackfill: true })]));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('keeps past-cycle edits on save failure and permits a successful retry', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  const onChange = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<WeeklyCycleSettings rows={[cycle]} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button', { name: '修改' }));
  fireEvent.change(screen.getByLabelText('周期标题'), { target: { value: '已结束周期调整' } });
  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-09-30' } });
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  await waitFor(() => expect(screen.getByText('保存失败，请重试，当前内容已保留')).toBeInTheDocument());
  expect(screen.getByLabelText('周期标题')).toHaveValue('已结束周期调整');
  expect(screen.getByLabelText('开始日期')).toHaveValue('2026-09-30');
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
  expect(onChange.mock.calls[1][0]).toEqual([expect.objectContaining({ id: cycle.id, month: '2026-09', startDate: '2026-09-30', title: '已结束周期调整' })]);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('prevents changes to past cycles without configuration permission', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  render(<WeeklyCycleSettings rows={[cycle]} disabled onChange={vi.fn()}/>);
  expect(screen.getByRole('button', { name: '增加周期' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '修改' })).toBeDisabled();
});

it('shows all months by default, supports month options and restores all cycles after clearing the filter', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  window.sessionStorage.setItem('okr.settings.weeklyMonth', '2026-10');
  const rows = [{ ...cycle, title: '十月周期' }, { ...cycle, id: 'sep', title: '九月周期', month: '2026-09', startDate: '2026-09-01', endDate: '2026-09-07' }];
  const onChange = vi.fn();
  const view = render(<WeeklyCycleSettings rows={rows} disabled={false} onChange={onChange}/>);
  expect(screen.getByRole('region', { name: '周期配置' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '十月周期' })).toBeVisible();
  expect(screen.getByRole('cell', { name: '九月周期' })).toBeVisible();
  expect(screen.getByText('全部周期')).toBeVisible();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '周期筛选' }));
  fireEvent.click(await screen.findByText('2026年09月'));
  expect(screen.queryByRole('cell', { name: '十月周期' })).not.toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '九月周期' })).toBeVisible();
  expect(onChange).not.toHaveBeenCalled();
  view.unmount();
  render(<WeeklyCycleSettings rows={rows} disabled={false} onChange={onChange}/>);
  expect(screen.queryByRole('cell', { name: '十月周期' })).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '周期筛选' }));
  fireEvent.click(await screen.findByText('全部周期'));
  expect(screen.getByRole('cell', { name: '十月周期' })).toBeVisible();
  expect(screen.getByRole('cell', { name: '九月周期' })).toBeVisible();
  expect(window.sessionStorage.getItem('okr.settings.weeklyCycleMonth')).toBe('all');
});

it('distinguishes active, upcoming and ended cycles with blue, gold and default tags', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  render(<WeeklyCycleSettings rows={[cycle, { ...cycle, id: 'active', startDate: '2026-10-13', endDate: '2026-10-19' }, { ...cycle, id: 'future', startDate: '2026-11-01', endDate: '2026-11-07', month: '2026-11' }]} disabled={false} onChange={vi.fn()}/>);
  expect(screen.getByText('进行中')).toHaveClass('ant-tag-blue');
  expect(screen.getByText('未开始')).toHaveClass('ant-tag-gold');
  expect(screen.getByText('已结束')).not.toHaveClass('ant-tag-blue');
  expect(screen.getByText('已结束')).not.toHaveClass('ant-tag-gold');
});

it('keeps the all-cycles filter after saving and provides an empty state when no cycles exist', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-15T12:00:00'));
  const onChange = vi.fn().mockResolvedValue(true);
  const view = render(<WeeklyCycleSettings rows={[]} disabled={false} onChange={onChange}/>);
  expect(view.container.querySelector('.ant-empty')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '增加周期' }));
  fireEvent.change(screen.getByLabelText('周期标题'), { target: { value: '新周期' } });
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('全部周期')).toBeVisible();
  expect(window.sessionStorage.getItem('okr.settings.weeklyCycleMonth')).not.toBe('2026-10');
});
