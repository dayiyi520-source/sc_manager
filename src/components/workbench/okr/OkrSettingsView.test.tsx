// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OkrSettings } from '../../../services/okrRepository';
import { OkrSettingsView } from './OkrSettingsView';
import { message } from 'antd';
afterEach(async()=>{ await act(async()=>{ message.destroy(); cleanup(); await new Promise(resolve=>setTimeout(resolve,0)); }); });

const settings: OkrSettings = { defaultView: 'list', timeRules: [{ key: 'weeklyReview', label: '周总结', startDay: 1, endDay: 31, allowBackfill: true }], templates: [{department:'研发',departments:['研发'],type:'support',fields:[],types:['支持']}], dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true } };

describe('weekly review settings', () => {
 it('saves different KR types for the same department but rejects a duplicate type',async()=>{
 const onSave=vi.fn(async()=>true);const types=[{department:'研发',departments:['研发'],type:'product',fields:[],stages:['设计']},{department:'研发',departments:['研发'],type:'support',fields:[],types:['支持']}];
 const view=render(<OkrSettingsView settings={{...settings,templates:types}} departments={['研发']} onSave={onSave}/>);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'保存配置'}));});expect(onSave).toHaveBeenCalledOnce();
 view.unmount();onSave.mockClear();render(<OkrSettingsView settings={{...settings,templates:[types[0],types[0]]}} departments={['研发']} onSave={onSave}/>);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'保存配置'}));});expect(onSave).not.toHaveBeenCalled();
 });
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

it('keeps comma input intact and saves department scopes and per-template stages/types', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={{...settings, templates:[{department:'研发',departments:['研发','设计'],type:'product',fields:[],stages:['原阶段']},{department:'交付',departments:['交付'],type:'delivery',fields:[],stages:['交付']},{department:'支撑',departments:['支撑'],type:'support',fields:[],types:[]}]}} departments={['研发','设计','交付','支撑']} onSave={onSave}/>);
  expect(screen.getByRole('button',{name:'KR模板'})).toBeInTheDocument();
  const stages = screen.getByLabelText('KR模板1阶段');
  fireEvent.change(stages,{target:{value:'设计,'}});
  expect(stages).toHaveValue('设计,');
  fireEvent.change(stages,{target:{value:'设计, 开发,测试'}});
  fireEvent.change(screen.getByLabelText('KR模板3类型'),{target:{value:'客户支持,内部支持'}});
  await act(async () => { fireEvent.click(screen.getByRole('button',{name:'保存配置'})); });
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0][0].templates[0]).toMatchObject({departments:['研发','设计'],stages:['设计','开发','测试']});
  expect(onSave.mock.calls[0][0].templates[2].types).toEqual(['客户支持','内部支持']);
});

it('starts a new configuration without selecting a department or template and requires generic types', () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={settings} departments={['研发','交付']} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button',{name:'添加 KR 模板配置'}));
  expect(screen.getByText('请选择部门')).toBeInTheDocument();
  expect(screen.getByText('请选择kr模板')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByLabelText('KR模板2部门'));
  expect(screen.queryByText('产研部门',{selector:'.ant-select-item-option-content'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'保存配置'}));
  expect(onSave).not.toHaveBeenCalled();
});
it('rejects empty types for a generic template', () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={settings} departments={['研发']} onSave={onSave}/>);
  fireEvent.change(screen.getByLabelText('KR模板1类型'),{target:{value:''}});
  fireEvent.click(screen.getByRole('button',{name:'保存配置'}));
  expect(onSave).not.toHaveBeenCalled();
});

it('saves unrelated policy settings without inventing missing legacy template stages', async () => {
  const onSave = vi.fn(async (_settings: OkrSettings) => true);
  render(<OkrSettingsView settings={{...settings,templates:[{department:'研发',type:'product',fields:[]}]}} onSave={onSave}/>);
  fireEvent.click(screen.getByRole('button',{name:'周期设置'}));
  await act(async () => { fireEvent.click(screen.getByRole('button',{name:'保存配置'})); });
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave.mock.calls[0][0].templates[0].stages).toEqual([]);
});
