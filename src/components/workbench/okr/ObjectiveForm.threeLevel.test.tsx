// @vitest-environment jsdom
import React, { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm, type ObjectiveFormHandle } from './ObjectiveForm';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
const people: OkrPerson[] = [{ id: 'user-admin', name: '林志豪', department: '公司', supervisorId: null, rootFlag: 1, version: 0 },{ id: 'manager', name: '主管', jobTitle: '产品主管', department: '研发', supervisorId: 'user-admin', rootFlag: 0, version: 0 },{ id: 'employee', name: '员工', department: '研发', supervisorId: 'manager', rootFlag: 0, version: 0 }];
const reference: OkrRecord = { id: 'kr', kind: 'action', ownerId: 'user-admin', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '提高增长', deadline: '2026-10-31', assigneeIds: ['manager'], sourceObjectiveId: 'company', sourceKrId: 'kr', sourceVersion: 1, parentObjectiveId: 'company' } };
const templateSettings = {defaultView:'list' as const,timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:['客户成功']},templates:[{type:'product',department:'研发',departments:['研发'],fields:[],stages:['产品设计','UI设计','产品开发','测试验收','上线运维']}]};
const common = { settings:templateSettings, cycle: '2026-10', people, busy: false, unavailable: false, parents: [], threeLevel: true, onCancel: vi.fn() };
describe('三级目标沿用现有表单', () => {
 it('selects per-KR department types before product fields and preserves assignees, actions and weight',()=>{
 const ref=createRef<ObjectiveFormHandle>();const templates=[{type:'product',department:'研发',fields:[],stages:['UI设计']},{type:'support',department:'研发',fields:[],types:['内部支持']},{type:'delivery',department:'其他部门',fields:[],stages:['交付']}];
 render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门目标',keyResults:[{id:'k',title:'产研结果',structureType:'product',businessObject:'APP',weight:100,progress:0,assigneeIds:['manager'],details:[{id:'v',name:'V1',stage:'UI设计'}],executionActions:[{id:'a',ownerId:'manager',title:'本人行动',weight:100,progress:0}]}]}} settings={{...templateSettings,templates}} onSave={vi.fn()}/>);
 const selector=screen.getByLabelText('KR1模板');expect(selector).not.toBeDisabled();
 const fields=selector.closest('.supervisor-action-fields')!;expect(fields.querySelector('.ant-select')).toContainElement(selector);
 fireEvent.mouseDown(selector);expect(screen.queryByText('交付模板',{selector:'.ant-select-item-option-content'})).not.toBeInTheDocument();fireEvent.click(screen.getByText('通用模板',{selector:'.ant-select-item-option-content'}));
 expect(screen.queryByLabelText('A1 产品')).not.toBeInTheDocument();expect(screen.getByLabelText('A1 类型')).toBeInTheDocument();
 expect(ref.current!.snapshot().keyResults![0]).toMatchObject({structureType:'support',weight:100,assigneeIds:['manager'],executionActions:[{title:'本人行动'}]});expect(ref.current!.snapshot().keyResults![0].businessObject).toBeUndefined();expect(ref.current!.snapshot().keyResults![0].details).toBeUndefined();
 fireEvent.mouseDown(screen.getByLabelText('A1 类型'));fireEvent.click(screen.getByText('内部支持',{selector:'.ant-select-item-option-content'}));expect(ref.current!.snapshot().keyResults![0].businessObject).toBe('内部支持');
 });
 it('automatically selects and locks the only department KR type',()=>{
 render(<ObjectiveForm {...common} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference]} onSave={vi.fn()}/>);expect(screen.getByLabelText('KR1模板')).toBeDisabled();expect(screen.getByText('产研模板')).toBeInTheDocument();
 });
  it.each(['主管级', '个人级'])('uses the requested objective copy for %s autonomous goals', level => {
    render(<ObjectiveForm {...common} ownerId={level === '主管级' ? 'manager' : 'employee'} ownerName="本人" supervisor={level === '主管级'} root={false} goalLevel={level} initialPayload={{title:'',origin:'autonomous',goalModelVersion:2,goalLevel:level === '主管级' ? 'department' : 'personal'}} onSave={vi.fn()}/>);
    expect(screen.getByLabelText('目标名称')).toHaveAttribute('placeholder','输入目标名称：明确你要达成什么，不写含糊概括的目标。');
    if (level === '个人级') expect(screen.getByLabelText('本人A1内容')).toHaveAttribute('placeholder','输入你计划要做的动作描述');
  });
  it('keeps assigned personal source attribution and inherited KR content', () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn().mockResolvedValue(true);
    const source = {...reference, ownerId:'manager',payload:{...reference.payload,title:'完成产品设计',sourceObjectiveId:'department',businessObject:'产品甲',assigneeIds:['employee']}};
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" root={false} goalLevel="个人级" alignmentActions={[source]} onSave={save}/>);
    expect(screen.getByText('产品甲——来源于上级主管')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('本人A1内容'),{target:{value:'完成产品原型'}});
    const action = ref.current!.snapshot().keyResults![0].executionActions![0];
    expect(action.title).toBe('完成产品原型');
    expect(ref.current!.snapshot().keyResults![0].weight).toBe(100);
  });
  it.each(['product', 'delivery'] as const)('adds a %s detail through multi-select and preserves the existing plan', type => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference]} productLineOptions={['业务']} projectOptions={['业务']} productLineVersionOptions={{业务:['第一条','第二条']}} projectProductOptions={{业务:['第一条','第二条']}} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'计划',keyResults:[{id:'k',title:'计划',structureType:type,businessObject:'业务',weight:100,progress:0,details:[{id:'one',name:'第一条',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-10'}]}]}} onSave={vi.fn()}/>);
    fireEvent.mouseDown(screen.getByLabelText(type === 'product' ? 'A1 版本' : 'A1 产品'));
    fireEvent.click(screen.getByText('第二条',{selector:'.ant-select-item-option-content'}));
    const krs = ref.current?.snapshot().keyResults;
    expect(krs).toHaveLength(1);
    expect(krs?.[0].details).toHaveLength(2);
    expect(krs?.[0].details?.[0]).toMatchObject({id:'one',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-10'});
    expect(screen.getByLabelText('第二条 预计开始时间')).toBeInTheDocument();
  });
  it.each(['product', 'delivery'] as const)('edits independent %s detail stages without adding KRs and allows active detail dates', type => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" planLocked alignmentActions={[reference]} initialPayload={{ goalModelVersion: 2, goalLevel: 'department', title: '交付计划', keyResults: [{ id: 'k', title: '计划', structureType: type, businessObject: '业务', weight: 100, progress: 0, details: [
      { id: 'one', name: '第一条', stage: 'UI设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10' },
      { id: 'two', name: '第二条', stage: 'UI设计', plannedStartDate: '2026-10-11', plannedEndDate: '2026-10-25' },
    ] }] }} onSave={vi.fn()}/>);
    expect(screen.getByLabelText('第一条 预计开始时间')).not.toBeDisabled();
    expect(screen.getByLabelText('第二条 预计完成时间')).not.toBeDisabled();
    fireEvent.mouseDown(screen.getByLabelText(`第二条 ${type === 'product' ? '完成阶段' : '推进阶段'}`));
    fireEvent.click(screen.getByText(type === 'product' ? '产品开发' : '上线交付', { selector: '.ant-select-item-option-content' }));
    const krs = ref.current?.snapshot().keyResults;
    expect(krs).toHaveLength(1);
    expect(krs?.[0].weight).toBe(100);
    expect(krs?.[0].details?.[0].stage).toBe('UI设计');
    expect(krs?.[0].details?.[1].stage).toBe(type === 'product' ? '产品开发' : '上线交付');
  });
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
  it('editing keeps KR deadline locked and delegates the modification application', async () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn().mockResolvedValue(true);
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" root={false} supervisor goalLevel="主管级" planLocked alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门指标',sourceObjectiveId:'company',sourceKrId:'kr',sourceVersion:1,deadline:'2026-10-25',keyResults:[{id:'k',title:'KR',structureType:'support',businessObject:'支持',action:'处理',result:'完成',weight:100,progress:0,deadline:'2026-10-25'}]}} onSave={save}/>);
    expect(screen.getByLabelText('KR1 截止日期')).toBeDisabled();
    expect(screen.queryByLabelText('修改原因')).not.toBeInTheDocument();
    expect(screen.queryByText('实际完成时间')).not.toBeInTheDocument();
    await act(async () => { await ref.current?.submit(35); });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({weight:35,keyResults:[expect.objectContaining({weight:100})]}));
  });
  it('has no challenge type without an assigned source and blocks submission', async () => {
    const ref=createRef<ObjectiveFormHandle>(), save=vi.fn();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" onSave={save}/>);
    expect(screen.getByLabelText('目标编号 O1')).toHaveTextContent('O1');
    expect(screen.getByText('暂无指派给本人的 KR，请等待上级指派后填写')).toBeInTheDocument();
    expect(ref.current?.snapshot().objectiveType).toBe('target');
    await act(async()=>{expect(await ref.current?.submit()).toBe(false);});expect(save).not.toHaveBeenCalled();
  });
  it('blocks new department KRs when only another department has a template', async () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference]} settings={{...templateSettings, templates:[{type:'product',department:'其他部门',departments:['其他部门'],fields:[],stages:['开发']}]}} onSave={save}/>);
    expect(screen.getByText('请先为当前部门配置 KR 模板')).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'添加关键结果'})).toBeDisabled();
    expect(screen.queryByLabelText('A1 产品')).not.toBeInTheDocument();
    await act(async () => { expect(await ref.current?.submit()).toBe(false); });
    expect(save).not.toHaveBeenCalled();
  });
  it('uses the department template for every new KR instead of cycling fixed types', () => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'支撑目标',keyResults:[{id:'one',title:'支撑结果',weight:100,progress:0,businessObject:'客户成功',action:'支持',result:'完成'}]}} settings={{...templateSettings,templates:[{type:'support',department:'研发',departments:['研发'],fields:[],types:['客户成功']},{type:'product',department:'其他部门',departments:['其他部门'],fields:[],stages:['开发']}]}} onSave={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(screen.getByLabelText('A2 动作')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('A2 类型'));
    fireEvent.click(screen.getAllByText('客户成功',{selector:'.ant-select-item-option-content'})[0]);
    fireEvent.change(screen.getByLabelText('A2 动作'),{target:{value:'支持'}});
    fireEvent.change(screen.getByLabelText('A2 结果'),{target:{value:'完成'}});
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(screen.getByLabelText('A3 动作')).toBeInTheDocument();
    expect(screen.queryByLabelText('A3 版本')).not.toBeInTheDocument();
    expect(ref.current?.snapshot().keyResults?.map(kr=>kr.structureType)).toEqual(['support','support','support']);
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
    expect(screen.getByText('请先填写当前已有的O/KRA的内容后再继续')).toBeInTheDocument();
    expect(ref.current?.snapshot().keyResults![0].executionActions).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('本人A1内容'),{target:{value:'设计方案'}});
    expect(screen.queryByText('请先填写当前已有的O/KRA的内容后再继续')).not.toBeInTheDocument();
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

it('inherits the source deadline and disables later KR and action calendar dates', async () => {
  const ref = createRef<ObjectiveFormHandle>();
  const source = {...reference,payload:{...reference.payload,deadline:'2026-10-20'}};
  render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="主管级" alignmentActions={[source]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门计划',sourceKrId:'kr',keyResults:[{id:'k',title:'结果',structureType:'support',weight:100,progress:0,assigneeIds:['manager'],executionActions:[{id:'a',ownerId:'manager',title:'动作',progress:0,deadline:'2026-10-15'}]}]}} onSave={vi.fn()}/>);
  expect(ref.current?.snapshot().deadline).toBe('2026-10-20');
  expect(ref.current?.snapshot().keyResults?.[0].deadline).toBe('2026-10-20');
  fireEvent.click(screen.getByLabelText('KR1 截止日期'));
  fireEvent.focus(screen.getByLabelText('KR1 截止日期'));
  await waitFor(() => expect(document.querySelector('td[title="2026-10-21"]')).toHaveClass('ant-picker-cell-disabled'));
  expect(document.querySelector('td[title="2026-10-20"]')).not.toHaveClass('ant-picker-cell-disabled');
  fireEvent.keyDown(screen.getByLabelText('KR1 截止日期'),{key:'Escape',code:'Escape'});
  fireEvent.click(screen.getByLabelText('本人A1计划截止日期'));
  fireEvent.focus(screen.getByLabelText('本人A1计划截止日期'));
  const visibleDates = [...document.querySelectorAll('td[title="2026-10-21"]')];
  expect(visibleDates.length).toBeGreaterThan(0);
  visibleDates.forEach(date => expect(date).toHaveClass('ant-picker-cell-disabled'));
});
it('distributes three KR weights as five-percent increments', () => {
  const ref = createRef<ObjectiveFormHandle>();
  render(<ObjectiveForm {...common} ref={ref} ownerId="user-admin" ownerName="老板" root initialPayload={{title:'目标',keyResults:[{id:'a',title:'第一条',weight:50,progress:0},{id:'b',title:'第二条',weight:50,progress:0}]}} onSave={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
  expect(ref.current?.snapshot().keyResults?.map(kr => kr.weight)).toEqual([35,35,30]);
});
