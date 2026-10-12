// @vitest-environment jsdom
import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm, type ObjectiveFormHandle } from './ObjectiveForm';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
const people: OkrPerson[] = [{ id: 'user-admin', name: '林志豪', department: '公司', supervisorId: null, rootFlag: 1, version: 0 },{ id: 'manager', name: '主管', jobTitle: '产品主管', department: '研发', supervisorId: 'user-admin', rootFlag: 0, version: 0 },{ id: 'employee', name: '员工', department: '研发', supervisorId: 'manager', rootFlag: 0, version: 0 }];
const reference: OkrRecord = { id: 'kr', kind: 'action', ownerId: 'user-admin', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '提高增长', deadline: '2026-10-31', assigneeIds: ['manager'], sourceObjectiveId: 'company', sourceKrId: 'kr', sourceVersion: 1, parentObjectiveId: 'company' } };
const common = { cycle: '2026-10', people, busy: false, unavailable: false, parents: [], threeLevel: true, onCancel: vi.fn() };
describe('三级目标沿用现有表单', () => {
  it('company still writes text KR and has no department template fields', () => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ownerId="user-admin" ownerName="林志豪" root ref={ref} onSave={vi.fn()}/>);
    expect(screen.queryByLabelText('KR1业务类型')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加关键结果' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: '提高增长' } });
    fireEvent.change(screen.getByLabelText('A1 名称'), { target: { value: '提升用户规模' } });
    expect(ref.current?.snapshot()).toMatchObject({ goalLevel: 'company', keyResults: [{ title: '提升用户规模' }] });
  });
  it('supervisor sees only the assigned source and three types, with own actions in the same form', () => {
    const ref = createRef<ObjectiveFormHandle>();
    const payload = { goalModelVersion: 2 as const, goalLevel: 'department' as const, title: 'APP日新增提高至1万', sourceObjectiveId: 'company', sourceKrId: 'kr', sourceVersion: 1, keyResults: [{ id: 'dept-kr', title: '版本达到UI设计', businessObject: 'APP', version: 'V1', stage: 'UI设计', structureType: 'product' as const, weight: 100, progress: 0, deadline: '2026-10-25', assigneeIds: ['manager'] }] };
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference, { ...reference, id: 'unrelated', payload: { title: '无关方向', assigneeIds: ['another'] } }]} initialPayload={payload} onSave={vi.fn()}/>);
    expect(screen.queryByText(/无关方向/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A1 商机')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1业务类型')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加本人动作' }));
    fireEvent.change(screen.getByLabelText('本人A1内容'), { target: { value: '完成设计方案' } });
    expect(ref.current?.snapshot().keyResults?.[0].executionActions?.[0]).toMatchObject({ ownerId: 'manager', title: '完成设计方案' });
    expect(screen.queryByLabelText('本人A1承接人员')).not.toBeInTheDocument();
  });
  it('employee inherits a read-only KR and only edits own A', () => {
    const ref = createRef<ObjectiveFormHandle>();
    const source = { ...reference, ownerId: 'manager', payload: { ...reference.payload, assigneeIds: ['employee'], title: '完成APP设计', sourceObjectiveId: 'department' } };
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" alignmentActions={[source]} onSave={vi.fn()}/>);
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A1 名称')).not.toBeInTheDocument();
    expect(screen.getAllByText('完成APP设计').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('A1 承接人员')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1业务类型')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加关键结果' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加本人动作' }));
    expect(ref.current?.snapshot().keyResults?.[0].executionActions?.[0].ownerId).toBe('employee');
    expect(screen.getByLabelText('本人A1权重')).toHaveValue('100');
    const row=screen.getByLabelText('本人A1内容').closest('.okr-objective-columns');
    expect(row).toContainElement(screen.getByLabelText('本人A1权重'));
    expect(row).toContainElement(screen.getByLabelText('本人A1计划截止日期'));
  });
  it('editing an active plan locks dates and requires a change reason', async () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" root={false} supervisor goalLevel="主管级" planLocked alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门指标',sourceObjectiveId:'company',sourceKrId:'kr',sourceVersion:1,deadline:'2026-10-25',keyResults:[{id:'k',title:'KR',structureType:'support',businessObject:'支持',action:'处理',result:'完成',weight:100,progress:0,deadline:'2026-10-25'}]}} onSave={save}/>);
    expect(screen.getByLabelText('KR1 截止日期')).toBeDisabled();
    await act(async () => { expect(await ref.current?.submit()).toBe(false); });
    expect(screen.getByText('请填写修改原因')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('has no challenge type without an assigned source and blocks submission', async () => {
    const ref=createRef<ObjectiveFormHandle>(), save=vi.fn();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" onSave={save}/>);
    expect(screen.getByLabelText('目标编号 O1')).toHaveTextContent('O1');
    expect(screen.getByText('暂无指派给本人的 KR，请等待上级指派后填写')).toBeInTheDocument();
    expect(ref.current?.snapshot().objectiveType).toBe('target');
    await act(async()=>{expect(await ref.current?.submit()).toBe(false);});expect(save).not.toHaveBeenCalled();
  });
  it('renders configured KR field structures without a type selector', () => {
    render(<ObjectiveForm {...common} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'交付目标',keyResults:[{id:'one',title:'交付结果',weight:100,progress:0,structureType:'delivery',businessObject:'项目',version:'产品',stage:'交付'}]}} settings={{defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:false,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:['客户成功']},templates:[{type:'delivery',department:'交付',fields:[]},{type:'support',department:'支撑',fields:[]},{type:'product',department:'产研',fields:[]}]}} onSave={vi.fn()}/>);
    expect(screen.getByLabelText('A1 项目')).toBeInTheDocument();
    expect(screen.queryByLabelText('KR1业务类型')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(screen.getByLabelText('A2 动作')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('A2 类型'));
    fireEvent.click(screen.getByText('客户成功',{selector:'.ant-select-item-option-content'}));
    fireEvent.change(screen.getByLabelText('A2 动作'),{target:{value:'支持'}});
    fireEvent.change(screen.getByLabelText('A2 结果'),{target:{value:'完成'}});
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(screen.getByLabelText('A3 版本')).toBeInTheDocument();
    expect(screen.queryByLabelText('A3 商机')).not.toBeInTheDocument();
  });

  it('employee autonomous mode allows a short O and only own A without KR inputs', async()=>{
    const ref=createRef<ObjectiveFormHandle>(),save=vi.fn().mockResolvedValue(true);
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" initialPayload={{goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'本月维护',objectiveType:'challenge',keyResults:[{id:'own',title:'本月维护',weight:100,progress:0,assigneeIds:['employee'],executionActions:[{id:'a',ownerId:'employee',title:'例行维护',progress:0,weight:100,deadline:'2026-10-25'}]}]}} onSave={save}/>);
    expect(screen.getByLabelText('目标名称')).toHaveValue('本月维护');
    expect(screen.queryByLabelText('A1 名称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A1 承接人员')).not.toBeInTheDocument();
    expect(screen.getByLabelText('本人A1内容')).toHaveValue('例行维护');
    expect(screen.getByText('A 权重合计 100%')).toBeInTheDocument();
    expect(screen.queryByText(/KR 权重合计/)).not.toBeInTheDocument();
    expect(ref.current?.snapshot()).toMatchObject({origin:'autonomous',goalLevel:'personal',objectiveType:'challenge',deadline:'2026-10-25'});
    await act(async()=>{expect(await ref.current?.submit()).toBe(true);});
    expect(save).toHaveBeenCalledOnce();
  });
  it('legacy editing still presents result rows as KR',()=>{
    render(<ObjectiveForm {...common} threeLevel={false} ownerId="user-admin" ownerName="老板" root initialPayload={{title:'历史目标',keyResults:[{id:'old',title:'旧关键结果',weight:100,progress:0}]}} onSave={vi.fn()}/>);
    expect(screen.getByText('KR1')).toBeInTheDocument();expect(screen.getByText('KR 权重合计 100%')).toBeInTheDocument();
    expect(screen.queryByText('A1')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'添加关键结果'})).toBeInTheDocument();
  });

  it('blocks adding another KR or A until all current content is entered, and keeps progress out of the authoring form',()=>{
    const ref=createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门指标',keyResults:[{id:'kr',title:'部门结果',businessObject:'APP',version:'V1',stage:'UI设计',structureType:'product',weight:100,progress:0,assigneeIds:['manager']}]}} onSave={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'添加本人动作'}));
    expect(screen.queryByText('本人本月执行动作')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('本人A1进度')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'添加本人动作'}));
    expect(screen.getByText('请先填写当前已添加的O/KR/A的内容后再继续')).toBeInTheDocument();
    expect(ref.current?.snapshot().keyResults![0].executionActions).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('本人A1内容'),{target:{value:'设计方案'}});
    fireEvent.click(screen.getByRole('button',{name:'添加本人动作'}));
    expect(ref.current?.snapshot().keyResults![0].executionActions).toHaveLength(2);
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(ref.current?.snapshot().keyResults).toHaveLength(1);
    const operations=screen.getByRole('button',{name:'添加关键结果'}).closest('.okr-add-operations');
    expect(operations).toContainElement(screen.getByRole('button',{name:'添加本人动作'}));
  });
  it('employee assigned mode renders one readonly KR header and starts with an editable A row',()=>{
    const source={...reference,ownerId:'manager',payload:{...reference.payload,assigneeIds:['employee'],title:'完成APP设计',sourceObjectiveId:'department'}};
    render(<ObjectiveForm {...common} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" alignmentActions={[source]} onSave={vi.fn()}/>);
    expect(screen.getByLabelText('承接的 KR')).toHaveTextContent('KR');
    expect(screen.getByLabelText('本人A1内容')).toBeInTheDocument();
    expect(screen.queryByText('KR1')).not.toBeInTheDocument();
    expect(screen.getByText('A 权重合计 100%')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
  });

  it('preserves saved execution progress while editing the action name',()=>{
    const ref=createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" initialPayload={{goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'维护',keyResults:[{id:'own',title:'维护',weight:100,progress:0,assigneeIds:['employee'],executionActions:[{id:'a',ownerId:'employee',title:'已有动作',weight:100,progress:65}]}]}} onSave={vi.fn()}/>);
    expect(screen.queryByLabelText('本人A1进度')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('本人A1内容'),{target:{value:'更新动作'}});
    expect(ref.current?.snapshot().keyResults![0].executionActions![0]).toMatchObject({title:'更新动作',progress:65});
  });

});
