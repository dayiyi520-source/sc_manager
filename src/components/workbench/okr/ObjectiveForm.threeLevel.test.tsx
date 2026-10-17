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
 it('selects per-KR department types before product fields and preserves assignees, actions and weight',async()=>{
 const ref=createRef<ObjectiveFormHandle>();const templates=[{type:'product',department:'研发',fields:[],stages:['UI设计']},{type:'support',department:'研发',fields:[],types:['内部支持']},{type:'delivery',department:'其他部门',fields:[],stages:['交付']}];
 render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门目标',keyResults:[{id:'k',title:'产研结果',structureType:'product',businessObject:'APP',weight:100,progress:0,assigneeIds:['manager'],details:[{id:'v',name:'V1',stage:'UI设计'}],executionActions:[{id:'a',ownerId:'manager',title:'本人行动',weight:100,progress:0}]}]}} settings={{...templateSettings,templates}} onSave={vi.fn()}/>);
 const selector=screen.getByRole('button',{name:'KR类型'});expect(selector).toBeEnabled();
 expect(selector).toHaveClass('okr-kr-template-switcher');
 fireEvent.click(selector);
 fireEvent.click(await screen.findByText('通用KR'));
 expect(screen.queryByLabelText('A1 产品')).not.toBeInTheDocument();expect(screen.getByLabelText('A1 KR内容')).toBeInTheDocument();
 expect(ref.current!.snapshot().keyResults![0]).toMatchObject({structureType:'support',weight:100,assigneeIds:['manager'],executionActions:[{title:'本人行动'}]});expect(ref.current!.snapshot().keyResults![0].businessObject).toBeUndefined();expect(ref.current!.snapshot().keyResults![0].details).toBeUndefined();
 fireEvent.change(screen.getByLabelText('A1 KR内容'),{target:{value:'内部支持'}});expect(ref.current!.snapshot().keyResults![0].action).toBe('内部支持');
 });
 it('automatically selects and locks the only department KR type',()=>{
 render(<ObjectiveForm {...common} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} onSave={vi.fn()}/>);expect(screen.getByRole('button',{name:'KR类型'})).toBeEnabled();expect(screen.getByText('产研KR')).toBeInTheDocument();expect(screen.queryByText('KR1')).not.toBeInTheDocument();
 });
  it.each(['部门级', '个人级'])('uses the requested objective copy for %s autonomous goals', level => {
    render(<ObjectiveForm {...common} ownerId={level === '部门级' ? 'manager' : 'employee'} ownerName="本人" supervisor={level === '部门级'} root={false} goalLevel={level} initialPayload={{title:'',origin:'autonomous',goalModelVersion:2,goalLevel:level === '部门级' ? 'department' : 'personal'}} onSave={vi.fn()}/>);
    expect(document.querySelector('.okr-source-readiness')).not.toBeInTheDocument();
    expect(screen.queryByText(/已有指派给你的 KR|本部门已有生效目标，可选择对齐|本部门本月目标尚未生效，可先制定自主目标/)).not.toBeInTheDocument();
    if (level === '部门级') expect(screen.getByLabelText('目标名称')).toHaveAttribute('placeholder','输入目标名称：明确你要达成什么，不写含糊概括的目标。');
    else { expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument(); expect(screen.queryByLabelText('KR标识')).not.toBeInTheDocument(); }
    if (level === '个人级') expect(screen.getByLabelText('计划动作内容')).toHaveAttribute('placeholder','填写为达成部门目标成果要执行的具体工作内容');
  });
  it('preserves inherited O/KR when editing only one personal plan action', () => {
    const ref=createRef<ObjectiveFormHandle>();
    const original={goalModelVersion:2 as const,goalLevel:'personal' as const,origin:'assigned' as const,title:'主管原KR',sourceObjectiveId:'department',sourceKrId:'shared',deadline:'2026-10-25',keyResults:[{id:'shared',title:'主管原KR',weight:100,progress:0,deadline:'2026-10-25',assigneeIds:['employee'],executionActions:[{id:'a',ownerId:'employee',title:'原计划',weight:100,progress:0,deadline:'2026-10-25'}]}]};
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" root={false} goalLevel="个人级" alignmentActions={[]} initialPayload={original} onSave={vi.fn()}/>);
    expect(screen.queryByLabelText('KR标识')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('计划动作内容'),{target:{value:'新计划'}});
    const next=ref.current!.snapshot();
    expect(next.title).toBe(original.title); expect(next.keyResults?.[0].title).toBe(original.keyResults[0].title);
    expect(next.keyResults?.[0].executionActions?.[0].title).toBe('新计划');
  });
  it('keeps assigned personal source attribution and inherited KR content', () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn().mockResolvedValue(true);
    const source = {...reference, ownerId:'manager',payload:{...reference.payload,title:'完成产品设计',sourceObjectiveId:'department',parentObjectiveId:'department',businessObject:'产品甲',assigneeIds:['employee']}};
    const parent = {...reference, id:'department', kind:'objective' as const, payload:{...reference.payload,title:'部门O：提升产品交付质量',keyResults:[]}};
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" root={false} goalLevel="个人级" alignmentActions={[source]} okrRecords={[parent]} onSave={save}/>);
    expect(screen.getByRole('region', { name: '目标承接链路' })).toHaveTextContent('部门O：提升产品交付质量');
    expect(document.querySelector('.okr-source-heading')).not.toBeVisible();
    expect(screen.queryByText(/——来源于上级主管/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('计划动作内容'),{target:{value:'完成产品原型'}});
    const action = ref.current!.snapshot().keyResults![0].executionActions![0];
    expect(action.title).toBe('完成产品原型');
    expect(ref.current!.snapshot().keyResults![0].weight).toBe(100);
  });
  it('shows current row assignees read-only when editing an inherited personal target', () => {
    const detail = { id: 'v1', name: '版本一', assigneeIds: ['employee'] };
    const parent: OkrRecord = { ...reference, id: 'department', kind: 'objective', ownerId: 'manager', payload: { title: '部门目标', keyResults: [{ id: 'shared', title: '共同结果', weight: 100, progress: 0, details: [{ ...detail, assigneeIds: ['manager', 'employee'] }] }] } };
    render(<ObjectiveForm {...common} ownerId="employee" ownerName="员工" root={false} goalLevel="个人级" alignmentActions={[]} okrRecords={[parent]} initialPayload={{ goalModelVersion: 2, goalLevel: 'personal', origin: 'assigned', title: '共同结果', sourceObjectiveId: 'department', sourceKrId: 'shared', keyResults: [{ id: 'shared', title: '共同结果', weight: 100, progress: 0, details: [detail], executionActions: [] }] }} onSave={vi.fn()}/>);
    expect(screen.getByText('主管、员工')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '承接人' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/版本一.*承接人/)).not.toBeInTheDocument();
  });
  it.each(['product', 'delivery'] as const)('adds a %s detail through the parent and multi-child picker and preserves the existing plan', async type => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} productLineOptions={['业务','第二条']} projectOptions={['业务','第二条']} productLineVersionOptions={{业务:['第一条'],第二条:['版本2']}} projectProductOptions={{业务:['第一条'],第二条:['产品2']}} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'计划',keyResults:[{id:'k',title:'计划',structureType:type,businessObject:'业务',weight:100,progress:0,details:[{id:'one',name:'业务',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-10'}]}]}} onSave={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: type === 'product' ? '添加产品' : '添加项目' }));
    fireEvent.mouseDown(screen.getByLabelText(type === 'product' ? '关联产品' : '关联项目'));
    fireEvent.click(screen.getByText('第二条',{selector:'.ant-select-item-option-content'}));
    fireEvent.mouseDown(screen.getByLabelText(type === 'product' ? '关联迭代版本' : '关联项目产品'));
    fireEvent.click(screen.getByText(type === 'product' ? '版本2' : '产品2', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByRole('button', { name: /^确\s*定$/ }));
    await waitFor(() => expect(ref.current?.snapshot().keyResults?.[0].details).toHaveLength(2));
    const krs = ref.current?.snapshot().keyResults;
    expect(krs).toHaveLength(1);
    expect(krs?.[0].details).toHaveLength(2);
    expect(krs?.[0].details?.[0]).toMatchObject({id:'one',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-10'});
    if (type === 'product') expect(screen.getByLabelText('第二条 开始时间')).toBeInTheDocument();
    else expect(screen.getByLabelText('修改第二条明细')).toBeInTheDocument();
  });
  it.each(['product', 'delivery'] as const)('edits independent %s detail stages without adding KRs and allows active detail dates', type => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" planLocked alignmentActions={[reference]} initialPayload={{ goalModelVersion: 2, goalLevel: 'department', title: '交付计划', keyResults: [{ id: 'k', title: '计划', structureType: type, businessObject: '业务', weight: 100, progress: 0, details: [
      { id: 'one', name: '第一条', stage: 'UI设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10' },
      { id: 'two', name: '第二条', stage: 'UI设计', plannedStartDate: '2026-10-11', plannedEndDate: '2026-10-25' },
    ] }] }} onSave={vi.fn()}/>);
    if (type === 'product') {
      expect(screen.getByLabelText('第一条 开始时间')).not.toBeDisabled();
      expect(screen.getByLabelText('第二条 结束时间')).not.toBeDisabled();
    } else {
      expect(screen.getByLabelText('修改第一条明细')).toBeInTheDocument();
      expect(screen.getAllByText('未设置').length).toBeGreaterThan(0);
      expect(screen.getByLabelText('第一条 目标里程碑')).toBeInTheDocument();
    }
    if (type === 'product') {
      fireEvent.mouseDown(screen.getByLabelText('第二条 阶段'));
      fireEvent.click(screen.getByText('产品开发', { selector: '.ant-select-item-option-content' }));
    }
    const krs = ref.current?.snapshot().keyResults;
    expect(krs).toHaveLength(1);
    expect(krs?.[0].weight).toBe(100);
    expect(krs?.[0].details?.[0].stage).toBe('UI设计');
    expect(krs?.[0].details?.[1].stage).toBe(type === 'product' ? '产品开发' : 'UI设计');
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
  it('supervisor sees only the assigned source and three types without an add-own-action entry', () => {
    const ref = createRef<ObjectiveFormHandle>();
    const payload = { goalModelVersion: 2 as const, goalLevel: 'department' as const, title: 'APP日新增提高至1万', sourceObjectiveId: 'company', sourceKrId: 'kr', sourceVersion: 1, keyResults: [{ id: 'dept-kr', title: '版本达到UI设计', action: '完成设计', result: '按期交付', structureType: 'support' as const, weight: 100, progress: 0, deadline: '2026-10-25', assigneeIds: ['manager'] }] };
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference, { ...reference, id: 'unrelated', payload: { title: '无关方向', assigneeIds: ['another'] } }]} initialPayload={payload} onSave={vi.fn()}/>);
    expect(screen.queryByText(/无关方向/)).not.toBeInTheDocument();
    expect(document.querySelector('.department-objective-editor .okr-source-heading')).not.toBeVisible();
    expect(document.querySelector('.department-objective-editor .company-objective-weight-summary')).toHaveTextContent('权重100%');
    expect(document.querySelector('.department-objective-editor .okr-objective-deadline')).toHaveTextContent('截止日期');
    expect(screen.queryByLabelText('A1 商机')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1业务类型')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加本人动作' })).not.toBeInTheDocument();
  });
  it('employee inherits a read-only KR and gets one action input without A, weight or date controls', () => {
    const ref = createRef<ObjectiveFormHandle>();
    const source = { ...reference, ownerId: 'manager', payload: { ...reference.payload, assigneeIds: ['employee'], title: '完成APP设计', sourceObjectiveId: 'department' } };
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" alignmentActions={[source]} onSave={vi.fn()}/>);
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A1 名称')).not.toBeInTheDocument();
    expect(screen.queryByText('完成APP设计')).not.toBeInTheDocument();
    expect(ref.current?.snapshot().keyResults?.[0].title).toBe('完成APP设计');
    expect(screen.queryByLabelText('A1 承接人员')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1业务类型')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加关键结果' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加本人动作' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('计划动作内容')).toHaveAttribute('placeholder', '填写为达成部门目标成果要执行的具体工作内容');
    expect(screen.queryByLabelText(/本人A1|A1/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1 权重')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1 截止日期')).not.toBeInTheDocument();
    expect(ref.current?.snapshot().keyResults?.[0].executionActions).toHaveLength(1);
    expect(ref.current?.snapshot().keyResults?.[0].executionActions?.[0]).toMatchObject({ ownerId: 'employee', weight: 100, deadline: '2026-10-31' });
  });
  it('editing keeps KR deadline locked and delegates the modification application', async () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn().mockResolvedValue(true);
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" root={false} supervisor goalLevel="部门级" planLocked alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门指标',sourceObjectiveId:'company',sourceKrId:'kr',sourceVersion:1,deadline:'2026-10-25',keyResults:[{id:'k',title:'KR',structureType:'support',businessObject:'支持',action:'处理',result:'完成',weight:100,progress:0,deadline:'2026-10-25'}]}} onSave={save}/>);
    expect(screen.getByLabelText('KR1 截止日期')).toBeDisabled();
    expect(screen.queryByLabelText('修改原因')).not.toBeInTheDocument();
    expect(screen.queryByText('实际完成时间')).not.toBeInTheDocument();
    await act(async () => { await ref.current?.submit(35); });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({weight:35,keyResults:[expect.objectContaining({weight:100})]}));
  });
  it('has no challenge type without an assigned source and blocks submission', async () => {
    const ref=createRef<ObjectiveFormHandle>(), save=vi.fn();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" onSave={save}/>);
    expect(screen.getByLabelText('目标编号 O1')).toHaveTextContent('O1');
    expect(screen.getByText('暂无指派给本人的 KR，请等待上级指派后填写')).toBeInTheDocument();
    expect(ref.current?.snapshot().objectiveType).toBe('target');
    await act(async()=>{expect(await ref.current?.submit()).toBe(false);});expect(save).not.toHaveBeenCalled();
  });
  it('blocks new department KRs when only another department has a template', async () => {
    const ref = createRef<ObjectiveFormHandle>(), save = vi.fn();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} settings={{...templateSettings, templates:[{type:'product',department:'其他部门',departments:['其他部门'],fields:[],stages:['开发']}]}} onSave={save}/>);
    expect(screen.getByText('请先为当前部门配置 KR 模板')).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'添加关键结果'})).toBeDisabled();
    expect(screen.queryByLabelText('A1 产品')).not.toBeInTheDocument();
    await act(async () => { expect(await ref.current?.submit()).toBe(false); });
    expect(save).not.toHaveBeenCalled();
  });
  it('uses the department template for every new KR instead of cycling fixed types', () => {
    const ref = createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'支撑目标',keyResults:[{id:'one',title:'支撑结果',weight:100,progress:0,businessObject:'客户成功',action:'支持',result:'完成'}]}} settings={{...templateSettings,templates:[{type:'support',department:'研发',departments:['研发'],fields:[],types:['客户成功']},{type:'product',department:'其他部门',departments:['其他部门'],fields:[],stages:['开发']}]}} onSave={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(screen.getByLabelText('A2 KR内容')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('A2 KR内容'),{target:{value:'支持'}});
    expect(screen.getByLabelText('A2 期望达成的结果')).toHaveAttribute('placeholder', '填写产出物与闭环要求/交付要求，作为完成率判定依据。（动词开头：完成、实现、落实等）');
    fireEvent.change(screen.getByLabelText('A2 期望达成的结果'),{target:{value:'完成'}});
    fireEvent.click(screen.getByRole('button',{name:'添加关键结果'}));
    expect(screen.getByLabelText('A3 KR内容')).toBeInTheDocument();
    expect(screen.queryByLabelText('A3 版本')).not.toBeInTheDocument();
    expect(ref.current?.snapshot().keyResults?.map(kr=>kr.structureType)).toEqual(['support','support','support']);
  });

  it('employee autonomous mode allows a short O and only own A without KR inputs', async()=>{
    const ref=createRef<ObjectiveFormHandle>(),save=vi.fn().mockResolvedValue(true);
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" initialPayload={{goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'本月维护',objectiveType:'challenge',keyResults:[{id:'own',title:'本月维护',weight:100,progress:0,assigneeIds:['employee'],executionActions:[{id:'a',ownerId:'employee',title:'例行维护',progress:0,weight:100,deadline:'2026-10-25'}]}]}} onSave={save}/>);
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A1 名称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('A1 承接人员')).not.toBeInTheDocument();
    expect(screen.getByLabelText('计划动作内容')).toHaveValue('例行维护');
    expect(screen.queryByText('动作 权重合计 100%')).not.toBeInTheDocument();
    expect(screen.queryByText(/KR 权重合计/)).not.toBeInTheDocument();
    expect(ref.current?.snapshot()).toMatchObject({origin:'autonomous',goalLevel:'personal',objectiveType:'challenge',deadline:'2026-10-25'});
    await act(async()=>{expect(await ref.current?.submit()).toBe(true);});
    expect(save).toHaveBeenCalledOnce();
  });
  it('legacy editing still presents result rows as KR',()=>{
    render(<ObjectiveForm {...common} threeLevel={false} ownerId="user-admin" ownerName="老板" root initialPayload={{title:'历史目标',keyResults:[{id:'old',title:'旧关键结果',weight:100,progress:0}]}} onSave={vi.fn()}/>);
    expect(screen.queryByText('KR1')).not.toBeInTheDocument();expect(screen.getByText('KR 权重合计 100%')).toBeInTheDocument();
    expect(screen.queryByText('A1')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'添加关键结果'})).toBeInTheDocument();
  });

  it('does not offer supervisors an add-own-action operation',()=>{
    render(<ObjectiveForm {...common} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门指标',keyResults:[{id:'kr',title:'部门结果',action:'完成支持',result:'按期完成',structureType:'support',weight:100,progress:0,assigneeIds:['manager']}]}} onSave={vi.fn()}/>);
    expect(screen.queryByRole('button',{name:'添加本人动作'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/本人.*进度/)).not.toBeInTheDocument();
  });
  it('employee assigned mode shows the parent O and one editable plan-action input',()=>{
    const source={...reference,ownerId:'manager',payload:{...reference.payload,assigneeIds:['employee'],title:'完成APP设计',sourceObjectiveId:'department',parentObjectiveId:'department'}};
    const parent = {...reference, id:'department', ownerId:'manager', kind:'objective' as const, payload:{...reference.payload, title:'部门O：提升产品交付质量', keyResults:[]}};
    render(<ObjectiveForm {...common} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" alignmentActions={[source]} okrRecords={[parent]} onSave={vi.fn()}/>);
    expect(screen.getByRole('region', { name: '目标承接链路' })).toHaveTextContent('部门O：提升产品交付质量');
    expect(screen.queryByText(/——来源于上级主管/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('计划动作内容')).toHaveAttribute('placeholder','填写为达成部门目标成果要执行的具体工作内容');
    expect(screen.queryByText('KR1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/A1/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1 权重')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR1 截止日期')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'添加本人动作'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
  });

  it('preserves saved execution progress while editing the action name',()=>{
    const ref=createRef<ObjectiveFormHandle>();
    render(<ObjectiveForm {...common} ref={ref} ownerId="employee" ownerName="员工" supervisor root={false} goalLevel="个人级" initialPayload={{goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'维护',keyResults:[{id:'own',title:'维护',weight:100,progress:0,assigneeIds:['employee'],executionActions:[{id:'a',ownerId:'employee',title:'已有动作',weight:100,progress:65}]}]}} onSave={vi.fn()}/>);
    expect(screen.queryByLabelText('本人A1进度')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('计划动作内容'),{target:{value:'更新动作'}});
    expect(ref.current?.snapshot().keyResults![0].executionActions![0]).toMatchObject({title:'更新动作',progress:65});
  });

});

it('inherits the source deadline and disables later KR and action calendar dates', async () => {
  const ref = createRef<ObjectiveFormHandle>();
  const source = {...reference,payload:{...reference.payload,deadline:'2026-10-20'}};
  render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[source]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'部门计划',sourceKrId:'kr',keyResults:[{id:'k',title:'结果',structureType:'support',weight:100,progress:0,assigneeIds:['manager'],executionActions:[{id:'a',ownerId:'manager',title:'动作',progress:0,deadline:'2026-10-15'}]}]}} onSave={vi.fn()}/>);
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

it('shows project map milestones only for the selected project product', async () => {
  const ref=createRef<ObjectiveFormHandle>();
  render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} projectOptions={['项目甲']} projectProductOptions={{项目甲:['产品A','产品B']}} projectProductStageOptions={{'项目甲\u0000产品A':['启动','交付A'],'项目甲\u0000产品B':['启动','交付B']}} settings={{...templateSettings,templates:[{type:'delivery',department:'研发',fields:[],stages:['旧里程碑']}]}} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'交付',keyResults:[{id:'k',title:'旧',structureType:'delivery',businessObject:'项目甲',weight:100,progress:0,details:[{id:'d',name:'项目甲',version:'产品A',currentStage:'启动'}]}]}} onSave={vi.fn()}/>);
  fireEvent.mouseDown(screen.getByLabelText('项目甲 目标里程碑'));
  expect(screen.getByText('交付A',{selector:'.ant-select-item-option-content'})).toBeInTheDocument();
  expect(screen.queryByText('交付B',{selector:'.ant-select-item-option-content'})).not.toBeInTheDocument();
  expect(screen.queryByText('旧里程碑',{selector:'.ant-select-item-option-content'})).not.toBeInTheDocument();
  expect(ref.current?.snapshot().keyResults?.[0].details).toHaveLength(1);
});
it('selects another version of the same product without adding a KR or overwriting its plan', async () => {
  const ref = createRef<ObjectiveFormHandle>();
  render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} productLineOptions={['产品甲']} productLineVersionOptions={{ 产品甲: ['V1', 'V2'] }} initialPayload={{ goalModelVersion: 2, goalLevel: 'department', title: '产品交付', keyResults: [{ id: 'k', title: '交付', weight: 100, progress: 0, structureType: 'product', businessObject: '产品甲', details: [{ id: 'v1', name: '产品甲', version: 'V1', stage: 'UI设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10' }] }] }} onSave={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button', { name: '修改产品甲明细' }));
  fireEvent.mouseDown(screen.getByLabelText('关联迭代版本'));
  fireEvent.click(screen.getByText('V2', { selector: '.ant-select-item-option-content' }));
  fireEvent.click(screen.getByRole('button', { name: /^确\s*定$/ }));
  await waitFor(() => expect(ref.current?.snapshot().keyResults?.[0].details).toHaveLength(2));
  expect(ref.current?.snapshot().keyResults).toHaveLength(1);
  expect(ref.current?.snapshot().keyResults?.[0].details?.[0]).toMatchObject({ id: 'v1', version: 'V1', stage: 'UI设计', plannedEndDate: '2026-10-10' });
  expect(screen.queryByRole('button', { name: '移除产品甲 V1明细' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '移除产品甲 V2明细' }));
  expect(ref.current?.snapshot().keyResults?.[0].details).toHaveLength(1);
});
it('keeps the empty KR subtable as a disabled display-only placeholder', () => {
  const ref = createRef<ObjectiveFormHandle>();
  render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} initialPayload={{goalModelVersion:2,goalLevel:'department',title:'产品交付',keyResults:[{id:'k',title:'交付',weight:100,progress:0,structureType:'product',details:[]}]}} onSave={vi.fn()}/>);
  expect(screen.queryByLabelText('A1 承接人员')).not.toBeInTheDocument();
  expect(screen.getAllByText('暂未选择')).toHaveLength(2);
  expect(screen.getByLabelText('暂未选择 阶段')).toBeDisabled();
  expect(screen.getByLabelText('暂未选择 结束时间')).toBeDisabled();
  expect(ref.current?.snapshot().keyResults?.[0].details).toEqual([]);
});

it('locks the initialized O template title and commitment type without an import entry', () => {
  const ref = createRef<ObjectiveFormHandle>();
  render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor root={false} goalLevel="部门级" alignmentActions={[reference]} initialPayload={{ goalModelVersion: 2, goalLevel: 'department', title: '协作提升', objectiveType: 'target', objectiveTitleTemplateId: 'title-support', objectiveTemplateKrTypes: ['support'], keyResults: [] }} settings={{ ...templateSettings, objectiveTitleTemplates: [{ id: 'title-support', department: '研发', title: '协作提升', guidance: '', enabled: true, krTypes: ['support'] }] }} onSave={vi.fn()}/>);
  expect(screen.getByLabelText('目标名称')).toHaveAttribute('readonly');
  expect(screen.queryByRole('button', { name: '导入O模板' })).not.toBeInTheDocument();
  expect(ref.current?.snapshot()).toMatchObject({ title: '协作提升', objectiveType: 'target', objectiveTitleTemplateId: 'title-support' });
});
it.each(['assigned', 'autonomous'] as const)('does not offer batch removal for a personal %s goal', origin => {
 const onRemove = vi.fn();
 render(<ObjectiveForm {...common} ownerId="employee" ownerName="员工" root={false} goalLevel="个人级" objectiveIndex={1} onRemove={onRemove} initialPayload={{goalModelVersion:2,goalLevel:'personal',origin,title:'本人工作'}} onSave={vi.fn()}/>);
 expect(screen.getByLabelText('计划动作内容')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'删除计划动作'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'删除新增目标 O2'})).not.toBeInTheDocument();
 expect(onRemove).not.toHaveBeenCalled();
});
it('keeps batch removal available for department goals', () => {
 render(<ObjectiveForm {...common} ownerId="manager" ownerName="主管" root={false} goalLevel="部门级" objectiveIndex={1} onRemove={vi.fn()} initialPayload={{goalModelVersion:2,goalLevel:'department',origin:'autonomous',title:'部门目标'}} onSave={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'删除新增目标 O2'})).toBeInTheDocument();
});

it('submits a new supervisor own-personal target with one action and self ownership', async () => {
 const ref=createRef<ObjectiveFormHandle>(),save=vi.fn(async()=>true);
 render(<ObjectiveForm {...common} ref={ref} ownerId="manager" ownerName="主管" supervisor={false} root={false} goalLevel="个人级" initialPayload={{goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'',keyResults:[]}} onSave={save}/>);
 fireEvent.change(screen.getByLabelText('计划动作内容'),{target:{value:'完成个人工作'}});
 await act(async()=>{expect(await ref.current?.submit()).toBe(true);});
 expect(save).toHaveBeenCalledWith(expect.objectContaining({goalLevel:'personal',title:'完成个人工作',keyResults:[expect.objectContaining({title:'完成个人工作',assigneeIds:['manager']})]}));
});

it('shows department alignment choices when a supervisor creates a personal goal', async()=>{
 const department:OkrRecord={...reference,id:'department',kind:'objective',ownerId:'manager',payload:{goalLevel:'department',title:'本人部门目标',keyResults:[{id:'dept-kr',title:'部门KR',weight:100,progress:0}]}};
 const company:OkrRecord={...department,id:'company',ownerId:'user-admin',payload:{...department.payload,goalLevel:'company',title:'公司目标'}};
 render(<ObjectiveForm {...common} ownerId="manager" ownerName="主管" root={false} supervisor goalLevel="个人级" initialPayload={{goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'个人计划'}} okrRecords={[department,company]} onSave={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'选择对齐'}));
 expect(await screen.findByText('部门目标已生效目标')).toBeInTheDocument();
 expect(screen.getByText('O · 本人部门目标')).toBeInTheDocument();
 expect(screen.queryByText('O · 公司目标')).not.toBeInTheDocument();
});
