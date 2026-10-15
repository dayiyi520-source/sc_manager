// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OkrSettings } from '../../../services/okrRepository';
import { OkrSettingsView } from './OkrSettingsView';
import { message } from 'antd';
afterEach(async()=>{ await act(async()=>{ message.destroy(); cleanup(); await new Promise(resolve=>setTimeout(resolve,0)); }); });

const settings: OkrSettings = { defaultView: 'list', timeRules: [{ key: 'weeklyReview', label: '周总结', startDay: 1, endDay: 31, allowBackfill: true }], templates: [{department:'研发',departments:['研发'],type:'support',fields:[],types:['支持']}], dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true } };

describe('weekly review settings', () => {
  it('uses Monday through Sunday selectors, retains monthly dates and saves weekday values', async () => {
    const onSave = vi.fn(async (_settings: OkrSettings) => true);
    render(<OkrSettingsView settings={settings} onSave={onSave}/>);
    fireEvent.click(screen.getByRole('button', { name: '开放时间' }));
    const row = screen.getByText('周总结').closest('.okr-settings-time-rule') as HTMLElement;
    expect(within(row).getByText('周一')).toBeInTheDocument();
    expect(within(row).getByText('周日')).toBeInTheDocument();
    expect(within(row).queryByText('开始日')).not.toBeInTheDocument();
    expect(within(row).queryByText('短月份顺延到月末')).not.toBeInTheDocument();
    const monthly = screen.getByText('月总结').closest('.okr-settings-time-rule') as HTMLElement;
    expect(within(monthly).getByText('开始日')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '周报开放开始星期' }));
    fireEvent.click(screen.getByText('周五'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '保存配置' })); });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].timeRules.find(rule => rule.key === 'weeklyReview')).toMatchObject({ startDay: 5, endDay: 7 });
  });
  it('flags old date ranges instead of silently opening weekly access', () => {
    render(<OkrSettingsView settings={{ ...settings, timeRules: [{ ...settings.timeRules[0], startDay: 20, endDay: 31 }] }} onSave={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByRole('button', { name: '开放时间' }));
    expect(screen.getByText('请重新设置周报开放星期')).toBeInTheDocument();
    expect(screen.getByText('开始星期')).toBeInTheDocument();
    expect(screen.getByText('结束星期')).toBeInTheDocument();
  });
});

const template = { id: 'o', department: '研发', title: '原目标', guidance: '', enabled: true, krTypes: ['support'] as Array<'support'> };
const chooseKr = (index: number, label: string) => {
  fireEvent.mouseDown(screen.getByLabelText(`第${index}条KR模板`));
  fireEvent.click(screen.getAllByText(label, { selector: '.ant-select-item-option-content' }).at(-1)!);
  fireEvent.click(document.querySelector('.ant-modal-title')!);
};
it('uses a batch modal and saves multiple O titles directly with multiselect KR types', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={settings} departments={['研发']} onSave={onSave}/>);
  expect(screen.getByRole('heading', { name: 'OKR模板' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '添加O模板' }));
  expect(document.querySelector('.ant-modal')).toBeInTheDocument();
  expect(document.querySelector('.ant-drawer')).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByLabelText('模板适用部门'));
  fireEvent.click(screen.getByText('研发', { selector: '.ant-select-item-option-content' }));
  fireEvent.change(screen.getByLabelText('第1条O标题'), { target: { value: '版本交付' } });
  chooseKr(1, '产研 KR'); chooseKr(1, '通用 KR');
  fireEvent.click(screen.getByRole('button', { name: '继续添加O标题' }));
  fireEvent.change(screen.getByLabelText('第2条O标题'), { target: { value: '质量提升' } });
  chooseKr(2, '通用 KR');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '提交模板' })); });
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0][0].objectiveTitleTemplates).toEqual([
    expect.objectContaining({ department: '研发', title: '版本交付', krTypes: ['product', 'support'] }),
    expect.objectContaining({ department: '研发', title: '质量提升', krTypes: ['support'] }),
  ]);
  expect(screen.getByRole('button', { name: '编辑质量提升' })).toBeInTheDocument();
});
it('validates every row and preserves a failed batch for retry', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => false);
  render(<OkrSettingsView settings={{ ...settings, objectiveTitleTemplates: [template] }} departments={['研发']} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button', { name: '编辑原目标' }));
  fireEvent.change(screen.getByLabelText('第1条O标题'), { target: { value: '新目标' } });
  fireEvent.click(screen.getByRole('button', { name: '继续添加O标题' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '提交模板' })); });
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByLabelText('第1条O标题')).toHaveValue('新目标');
  fireEvent.click(screen.getByRole('button', { name: '移除第2条O模板' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '提交模板' })); });
  expect(screen.getByText('保存失败，请重试，当前内容已保留')).toBeInTheDocument();
  expect(screen.getByLabelText('第1条O标题')).toHaveValue('新目标');
  expect(screen.getByRole('button', { name: '编辑原目标' })).toBeInTheDocument();
});
it('deletes a saved row directly after confirmation and keeps it when saving fails', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => false);
  render(<OkrSettingsView settings={{ ...settings, objectiveTitleTemplates: [template] }} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button', { name: '删除原目标' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^删\s*除$/ })); });
  expect(onSave.mock.calls[0][0].objectiveTitleTemplates).toEqual([]);
  expect(screen.getByRole('button', { name: '编辑原目标' })).toBeInTheDocument();
  expect(screen.getByText('保存失败，请重试，当前内容已保留')).toBeInTheDocument();
});
it('saves edits directly while preserving saved settings from other tabs', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={{ ...settings, objectiveTitleTemplates: [template] }} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button', { name: '默认视图' }));
  expect(screen.getByRole('button', { name: '保存配置' })).toBeInTheDocument();
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
  fireEvent.click(screen.getByText('卡片视图', { selector: '.ant-select-item-option-content' }));
  fireEvent.click(screen.getByRole('button', { name: 'OKR模板' }));
  fireEvent.click(screen.getByRole('button', { name: '编辑原目标' }));
  fireEvent.change(screen.getByLabelText('第1条O标题'), { target: { value: '新目标' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '提交模板' })); });
  expect(onSave.mock.calls[0][0].defaultView).toBe('list');
  expect(onSave.mock.calls[0][0].objectiveTitleTemplates?.[0].title).toBe('新目标');
});
it('read-only users cannot add, edit or delete templates', () => {
  render(<OkrSettingsView settings={{ ...settings, objectiveTitleTemplates: [template] }} readOnly onSave={vi.fn(async () => true)}/>);
  expect(screen.getByRole('button', { name: '添加O模板' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '编辑原目标' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '删除原目标' })).toBeDisabled();
});
it('locks duplicate submissions until the batch save finishes', async () => {
  let resolveSave!: (value: boolean) => void;
  const onSave = vi.fn(() => new Promise<boolean>(resolve => { resolveSave = resolve; }));
  render(<OkrSettingsView settings={{ ...settings, objectiveTitleTemplates: [template] }} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button', { name: '编辑原目标' }));
  fireEvent.click(screen.getByRole('button', { name: '提交模板' }));
  fireEvent.click(screen.getByRole('button', { name: '提交模板' }));
  expect(onSave).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('第1条O标题')).toBeDisabled();
  await act(async () => { resolveSave(true); });
  await waitFor(() => expect(screen.getByRole('button', { name: '编辑原目标' })).toBeEnabled());
});

it('persists weekly cycles immediately, keeps the tab and preserves input on failure', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => false);
  render(<OkrSettingsView settings={settings} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button', { name: '周报周期配置' }));
  expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '增加周期' }));
  fireEvent.change(screen.getByLabelText('周期标题'), { target: { value: '新增周期' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^确\s*认$/ })); });
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0][0].weeklyReviewCycles?.[0].title).toBe('新增周期');
  expect(screen.getByLabelText('周期标题')).toHaveValue('新增周期');
  await waitFor(() => expect(screen.getByText('保存失败，请重试，当前内容已保留')).toBeInTheDocument());
  onSave.mockResolvedValue(true);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^确\s*认$/ })); });
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('cell', { name: '新增周期' })).toBeVisible());
});
it('persists role removal directly without saving unrelated draft fields', async () => {
  const people = [{ id: 'a', name: '甲', department: '研发', rootFlag: 1, supervisorId: null, version: 0 }, { id: 's', name: '乙', department: '研发', rootFlag: 0, supervisorId: 'a', version: 0 }];
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={{ ...settings, administratorIds: ['a'], supervisorIds: ['s'] }} people={people} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button', { name: '角色设置' }));
  expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(within(screen.getByText('乙').closest('tr')!).getByRole('button', { name: '移除' })); });
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0][0]).toMatchObject({ administratorIds: ['a'], supervisorIds: [] });
  expect(screen.queryByText('乙')).not.toBeInTheDocument();
});
