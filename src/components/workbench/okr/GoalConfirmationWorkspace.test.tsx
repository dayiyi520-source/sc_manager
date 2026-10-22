// @vitest-environment jsdom
import React from 'react';
import dayjs from 'dayjs';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {GoalConfirmationWorkspace} from './GoalConfirmationWorkspace';
import {OkrScopeSidebar} from './OkrScopeSidebar';
import {okrRepository,type OkrRecord,type OkrPerson} from '../../../services/okrRepository';
const people:OkrPerson[]=[{id:'boss',name:'管理员',rootFlag:1,department:'管理部',supervisorId:null,version:1},{id:'manager',name:'主管甲',jobTitle:'产品主管',rootFlag:0,department:'产品部',supervisorId:'boss',version:1},{id:'staff',name:'员工甲',rootFlag:0,department:'产品部',supervisorId:'manager',version:1}];
const record:OkrRecord={id:'o',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:2,payload:{title:'原目标',weight:100,keyResults:[{id:'k',title:'原结果',weight:100,progress:0}]},changeRequest:{id:'c',status:'pending',purpose:'update',reason:'指标变化',reviewerId:'manager',baseVersion:1,requestedAt:'2026-10-13',payload:{title:'调整目标',weight:100,keyResults:[{id:'k',title:'调整结果',weight:100,progress:0}]}}};
const props={records:[record],people,viewerId:'manager',selectedMemberId:'staff',selectedCycles:['2026-10'],onSelectMember:vi.fn(),onRefresh:vi.fn().mockResolvedValue(undefined),loading:false,work:[],workLoading:false,workError:null,onRetryWork:vi.fn()};
afterEach(()=>{vi.restoreAllMocks();vi.clearAllMocks();});
describe('goal confirmation workspace',()=>{
 it('shows total and member badges and only appropriate confirmation members',()=>{
 render(<OkrScopeSidebar people={people} records={[record]} currentUserId="manager" selection={{scope:'my'}} onSelect={vi.fn()} onAddTarget={vi.fn()}/>);
 expect(screen.queryByRole('button',{name:'目标确认'})).not.toBeInTheDocument();
 });
 it('submits approval and renders an empty pending workspace after refreshed data',async()=>{
 const update=vi.spyOn(okrRepository,'update').mockResolvedValue(undefined);
 const view=render(<GoalConfirmationWorkspace {...props}/>);
 expect(screen.getByRole('heading',{name:'调整目标'})).toBeInTheDocument();expect(document.querySelector('.okr-confirmation-change-card')).toBeInTheDocument();expect(document.querySelector('.okr-confirmation-objective-card .okr-confirmation-status')).toHaveTextContent('待确认');expect(screen.queryByLabelText('目标修改对比')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'查看明细'}));expect(screen.getByText('原目标',{selector:'.is-before'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'提 交'}));
 await waitFor(()=>expect(update).toHaveBeenCalledWith(record,'approve-change',{feedback:''},'manager'));
 await waitFor(()=>expect(props.onRefresh).toHaveBeenCalled());
 view.rerender(<GoalConfirmationWorkspace {...props} records={[{...record,payload:record.changeRequest!.payload,changeRequest:{...record.changeRequest!,status:'approved'}}]}/>);
 expect(screen.getByText('暂无待确认目标')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'提 交'})).not.toBeInTheDocument();
    expect(screen.queryByText('2026年10月')).not.toBeInTheDocument();
    expect(screen.getByText('暂无待确认目标')).toBeInTheDocument();
 });
 it('requires a suggestion and retains feedback on conflict without approving',async()=>{
 const update=vi.spyOn(okrRepository,'update').mockRejectedValue(new Error('版本冲突，请刷新'));
 render(<GoalConfirmationWorkspace {...props}/>);fireEvent.click(screen.getByLabelText('建议修改'));fireEvent.click(screen.getByRole('button',{name:'提 交'}));expect(screen.getByText('请填写修改建议')).toBeInTheDocument();expect(update).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('修改建议'),{target:{value:'请补齐交付指标'}});fireEvent.click(screen.getByRole('button',{name:'提 交'}));expect(await screen.findByText('版本冲突，请刷新')).toBeInTheDocument();expect(screen.getByLabelText('修改建议')).toHaveValue('请补齐交付指标');expect(update).toHaveBeenCalledWith(record,'return-change',{feedback:'请补齐交付指标'},'manager');expect(props.onRefresh).not.toHaveBeenCalled();
 });
 it('offers the common grouped periods even when no member has pending goals',()=>{
 const onSelectCycles=vi.fn();
 const nextMonth=dayjs().add(1,'month');
 const view=render(<GoalConfirmationWorkspace {...props} records={[]} selectedCycles={[nextMonth.format('YYYY-MM')]} onSelectCycles={onSelectCycles}/>);
 expect(screen.getByRole('combobox',{name:'周期筛选'})).toBeEnabled();
 expect(document.querySelector('.okr-cycle-filter')).toHaveTextContent(`周期：${nextMonth.format('YYYY年MM月')}`);
 expect(screen.getByText('暂无待确认目标')).toBeInTheDocument();
 fireEvent.mouseDown(document.querySelector('.okr-cycle-filter .ant-select-content')!);
 for (const group of ['进行中','未开始','已结束']) expect(screen.getByText(group)).toBeInTheDocument();
 fireEvent.click(screen.getByText('已结束'));
 fireEvent.click(screen.getByText(dayjs().subtract(1,'month').format('YYYY年MM月')));
 expect(onSelectCycles).toHaveBeenCalledWith(expect.arrayContaining([nextMonth.format('YYYY-MM'),dayjs().subtract(1,'month').format('YYYY-MM')]));
 view.rerender(<GoalConfirmationWorkspace {...props} records={[]} selectedCycles={[nextMonth.format('YYYY-MM')]} selectedMemberId="manager" onSelectCycles={onSelectCycles}/>);
 expect(document.querySelector('.okr-cycle-filter')).toHaveTextContent(`周期：${nextMonth.format('YYYY年MM月')}`);
 });
 it('preserves a selected period after approval and distinguishes clearing from an empty result',()=>{
 const view=render(<GoalConfirmationWorkspace {...props}/>);
 view.rerender(<GoalConfirmationWorkspace {...props} records={[{...record,changeRequest:{...record.changeRequest!,status:'approved'}}]}/>);
 expect(document.querySelector('.okr-cycle-filter')).toHaveTextContent('周期：2026年10月');
 expect(screen.getByText('暂无待确认目标')).toBeInTheDocument();
 view.rerender(<GoalConfirmationWorkspace {...props} selectedCycles={[]}/>);
 expect(screen.getByText('请选择周期')).toBeInTheDocument();
 });
 it('keeps the common period control disabled while loading',()=>{
 render(<GoalConfirmationWorkspace {...props} loading/>);
 expect(screen.getByRole('combobox',{name:'周期筛选'})).toBeDisabled();
 });
 it('toggles comparison and period filters without mutations',()=>{
 const update=vi.spyOn(okrRepository,'update');render(<GoalConfirmationWorkspace {...props}/>);
 fireEvent.click(screen.getByRole('switch',{name:'修改对比'}));expect(screen.queryByLabelText('目标修改对比')).not.toBeInTheDocument();expect(update).not.toHaveBeenCalled();
 });
});
