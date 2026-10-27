// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalWeightConfirmation, goalWeightRemainder, initialGoalWeights } from './GoalWeightConfirmation';

describe('submission weight confirmation',()=>{
  it('retains valid weights and distributes legacy independent 100 percent weights',()=>{
    expect(initialGoalWeights([{weight:25},{weight:75}])).toEqual([25,75]);
    expect(initialGoalWeights([{weight:100},{weight:100},{weight:100}])).toEqual([34,33,33]);
    expect(goalWeightRemainder([60,30,10])).toBe(10);
    expect(goalWeightRemainder([80,30,0])).toBe(-10);
  });
  it('allows every weight to be edited and submits exact weights',async()=>{
    const first=vi.fn().mockResolvedValue(true),last=vi.fn().mockResolvedValue(true),finish=vi.fn();
    render(<GoalWeightConfirmation label="KR" entries={[{id:'one',title:'主结果一',weight:100,submit:first},{id:'two',title:'主结果二',weight:100,submit:last}]} onFinish={finish}/>);
    expect(screen.getByLabelText('KR2权重')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('KR1权重'),{target:{value:'65'}});
    expect(screen.getByLabelText('KR2权重')).toHaveValue('35');
    fireEvent.click(screen.getByRole('button',{name:'确认并提交'}));
    await waitFor(()=>expect(finish).toHaveBeenCalledWith(['one','two'],true));
    expect(first).toHaveBeenCalledWith(65); expect(last).toHaveBeenCalledWith(35);
  });
  it('blocks invalid remainder and cancel performs no writes',()=>{
    const submit=vi.fn(),finish=vi.fn();
    render(<GoalWeightConfirmation label="O" entries={[{id:'one',title:'目标一',weight:100,submit},{id:'two',title:'目标二',weight:100,submit}]} onFinish={finish}/>);
    fireEvent.change(screen.getByLabelText('O1权重'),{target:{value:'100'}});
    expect(screen.getByLabelText('O2权重')).toHaveValue('0');
    expect(screen.getByRole('button',{name:'确认并提交'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'取 消'}));
    expect(submit).not.toHaveBeenCalled();expect(finish).toHaveBeenCalledWith([],false);
  });
  it('retains input after failure and does not repeat completed writes on retry',async()=>{
    const first=vi.fn().mockResolvedValue(true),last=vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true),finish=vi.fn();
    render(<GoalWeightConfirmation label="O" entries={[{id:'one',title:'目标一',weight:40,submit:first},{id:'two',title:'目标二',weight:60,submit:last}]} onFinish={finish}/>);
    fireEvent.click(screen.getByRole('button',{name:'确认并提交'}));
    await screen.findByText(/提交未完成/);
    expect(screen.getByLabelText('O1权重')).toHaveValue('40');
    expect(finish).not.toHaveBeenCalled();
    await waitFor(()=>expect(screen.getByRole('button',{name:/确认并提交/})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:/确认并提交/}));
    await waitFor(()=>expect(finish).toHaveBeenCalledWith(['one','two'],true));
    expect(first).toHaveBeenCalledTimes(1);expect(last).toHaveBeenCalledTimes(2);
  });
  it('locks single objective and KR weights at 100 percent and shows one footer total', () => {
    const submit = vi.fn().mockResolvedValue(true);
    render(<GoalWeightConfirmation title="2026年10月设置权重" groups={[
      { id: 'objectives', title: '本月 O', kind: 'objective', entries: [{ id: 'o1', title: '目标一', weight: 100, submit }] },
      { id: 'o1-krs', title: '目标一', kind: 'keyResult', parentEntryId: 'o1', entries: [{ id: 'kr1', title: '关键结果一', weight: 100, submit }] },
    ]} onFinish={vi.fn()} />);
    expect(screen.getByLabelText('O1权重')).toHaveValue('100');
    expect(screen.getByLabelText('O1权重')).toBeDisabled();
    expect(screen.getByLabelText('KR1权重')).toHaveValue('100');
    expect(screen.getByLabelText('KR1权重')).toBeDisabled();
    expect(screen.getByText('权重和：100%')).toBeInTheDocument();
    expect(screen.queryByText(/本组 KR 权重合计/)).not.toBeInTheDocument();
    expect(screen.queryByText(/O 权重合计/)).not.toBeInTheDocument();
  });
});
