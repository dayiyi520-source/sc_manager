// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrSettings } from '../../../services/okrRepository';
import { OkrSettingsView } from './OkrSettingsView';

const settings: OkrSettings = { defaultView: 'list', timeRules: [{ key: 'weeklyReview', label: '周总结', startDay: 1, endDay: 31, allowBackfill: true }], templates: [], dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true } };

describe('weekly review settings', () => {
  it('uses Monday through Sunday selectors, retains monthly dates and saves weekday values', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));
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
