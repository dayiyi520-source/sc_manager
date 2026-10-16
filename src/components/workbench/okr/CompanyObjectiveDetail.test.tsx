// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompanyObjectiveDetail, companyActionTasks, actionGroupDetailRecord } from './CompanyObjectiveDetail';
import { buildGoalHierarchy } from './GoalHierarchyView';
import { okrRepository, type OkrRecord, type OkrWork } from '../../../services/okrRepository';

const objective: OkrRecord = {id:'o',kind:'objective',ownerId:'boss',periodKey:'2026-10',status:'active',version:1,payload:{title:'公司经营目标',weight:40,keyResults:[{id:'a',title:'完成交付',weight:100,progress:10}]}};
const child: OkrRecord = {id:'child',kind:'action',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{title:'部门交付',parentObjectiveId:'o',parentActionId:'a',weight:100,progress:75}};
const task = {id:'task',title:'实际任务',objectiveId:'o',keyResultId:'child',status:'已完成'} as OkrWork;

describe('company objective detail', () => {
  it('renders assigned personal primary KR, inherited detail rows and only owner actions once', async () => {
    vi.spyOn(okrRepository,'events').mockResolvedValue([]);
    const people=[{id:'manager',name:'主管甲',department:'产品部',rootFlag:0,supervisorId:'boss',version:1},{id:'staff',name:'成员乙',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
    const parent: OkrRecord={...objective,id:'manager',ownerId:'manager',payload:{title:'主管目标',keyResults:[{id:'shared',title:'原型阶段',weight:100,progress:0}]}};
    const personal: OkrRecord={...objective,id:'personal',ownerId:'staff',payload:{title:'原型阶段',goalLevel:'personal',origin:'assigned',weight:40,sourceObjectiveId:'manager',sourceKrId:'shared',alignments:[{parentObjectiveId:'manager',parentKeyResultId:'shared'}],keyResults:[{id:'shared',title:'原型阶段',businessObject:'产品甲',structureType:'product',weight:100,progress:0,details:[{id:'d',name:'V1.0',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-15'}],executionActions:[{id:'mine',ownerId:'staff',title:'绘制交互原型',weight:100,progress:25,deadline:'2026-10-15'},{id:'other',ownerId:'manager',title:'其他人动作',weight:100,progress:0}]}]}};
    render(<CompanyObjectiveDetail record={personal} records={[parent,personal]} people={people} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getAllByText('原型阶段')).toHaveLength(1);
    expect(screen.getByText('产品甲——来源于上级主管甲')).toBeInTheDocument();
    expect(screen.getByText('V1.0')).toBeInTheDocument();expect(screen.getByText('UI设计')).toBeInTheDocument();
    expect(screen.getByText('绘制交互原型')).toBeInTheDocument();expect(screen.queryByText('其他人动作')).not.toBeInTheDocument();
    expect(screen.getByLabelText('A1进度：25%')).toBeInTheDocument();
    expect(screen.getByText('目标权重:40%')).toBeInTheDocument();
    expect(screen.getByText('产品部',{selector:'.company-detail-department'})).toBeInTheDocument();
    await screen.findByText('暂无动态记录');vi.restoreAllMocks();
  });
  it('shows the derived supervisor KR summary and its department in details', async () => {
    vi.spyOn(okrRepository,'events').mockResolvedValue([]);
    const record:OkrRecord={id:'manager',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{goalLevel:'department',title:'主管O',keyResults:[{id:'k',title:'旧的拼接文案',weight:100,progress:0,structureType:'product',details:[{id:'a',name:'产品甲',version:'V1',stage:'设计'},{id:'b',name:'产品甲',version:'V2',stage:'开发'}]}]}};
    render(<CompanyObjectiveDetail record={record} records={[record]} people={[{id:'manager',name:'主管',jobTitle:'产品主管',department:'产品部',rootFlag:0,supervisorId:'boss',version:1}]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByText('按期完成2个产品版本迭代计划 · 达到对应的阶段')).toBeInTheDocument();
    expect(screen.getByText('产品部',{selector:'.company-detail-department'})).toBeInTheDocument();
    vi.restoreAllMocks();
  });
  it('keeps legacy manager breakdown data and shows only the actual lower member alignments', async () => {
    vi.spyOn(okrRepository, 'events').mockResolvedValue([]);
    const people = [
      {id:'boss',name:'林志豪',department:'管理层',rootFlag:1,supervisorId:null,version:1},
      {id:'manager',name:'陈宇璋',jobTitle:'产品主管',department:'产品部',rootFlag:0,supervisorId:'boss',version:1},
      {id:'staff',name:'下级成员',department:'产品部',rootFlag:0,supervisorId:'manager',version:1},
    ];
    const ownChild = {...child, id:'own-child', payload:{...child.payload,title:'主管自己的拆解',parentActionId:child.id}};
    const lower = {...child, id:'lower', ownerId:'staff', payload:{...child.payload,title:'下级对齐的动作',parentActionId:child.id}};
    const all = [objective, child, ownChild, lower];
    const display = actionGroupDetailRecord(child, all, people);
    expect(display.ownerId).toBe('manager');
    expect(display.payload.keyResults?.map(item => item.id)).toEqual([child.id]);
    render(<CompanyObjectiveDetail record={child} records={all} people={people} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByText('部门级')).toBeInTheDocument();
    expect(screen.queryByText('公司级')).not.toBeInTheDocument();
    expect(screen.getByLabelText('制定人：陈宇璋')).toBeInTheDocument();
    expect(screen.queryByText('所属部门:产品部')).not.toBeInTheDocument();
    expect(screen.queryByText(/完成时间:/)).not.toBeInTheDocument();
    expect(screen.getByText('完成交付——来源于上级林志豪')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'KR1下级对齐'}));
    expect(screen.getByText('下级成员 · 75%')).toBeInTheDocument();
    expect(screen.queryByText('陈宇璋 · 75%')).not.toBeInTheDocument();
    expect(screen.queryByText('主管自己的拆解')).not.toBeInTheDocument();
    await screen.findByText('暂无动态记录');
    vi.restoreAllMocks();
  });

  it('shows upstream action content and marks only assignees with actual submitted alignments', async () => {
    vi.spyOn(okrRepository, 'events').mockResolvedValue([]);
    const people = [
      {id:'boss',name:'上级甲',department:'管理层',rootFlag:1,supervisorId:null,version:1},
      {id:'manager',name:'主管乙',department:'产品部',rootFlag:0,supervisorId:'boss',version:1},
      {id:'staff',name:'成员丙',department:'产品部',rootFlag:0,supervisorId:'manager',version:1},
      {id:'draft-owner',name:'草稿成员',department:'产品部',rootFlag:0,supervisorId:'manager',version:1},
    ];
    const manager: OkrRecord = {id:'manager-o',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{title:'主管目标',alignments:[{parentObjectiveId:'o',parentKeyResultId:'a'}],keyResults:[{id:'manager-a',title:'主管动作',weight:100,progress:0,assigneeIds:['staff','draft-owner']}]}};
    const lower: OkrRecord = {id:'lower-o',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:1,payload:{title:'个人目标',alignments:[{parentObjectiveId:'manager-o',parentKeyResultId:'manager-a'}]}};
    render(<CompanyObjectiveDetail record={manager} records={[objective,manager,lower,{...lower,id:'draft-o',ownerId:'draft-owner',status:'draft'}]} people={people} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByText('完成交付——来源于上级上级甲')).toBeInTheDocument();
    expect(screen.queryByText('公司经营目标')).not.toBeInTheDocument();
    expect(screen.getByLabelText('成员丙已对齐此动作')).toBeInTheDocument();
    expect(screen.queryByLabelText('草稿成员已对齐此动作')).not.toBeInTheDocument();
    expect(screen.getByText('@成员丙').closest('.company-action-title')).toContainElement(screen.getByText('主管动作'));
    await screen.findByText('暂无动态记录');
    vi.restoreAllMocks();
  });

  it('rolls up descendant progress and collects deduplicated evidence without unrelated tasks', () => {
    const root = buildGoalHierarchy([objective,child],'2026-10')[0];
    expect(root.progress).toBe(75);
    expect(companyActionTasks(root.children[0],'o',[task,task,{...task,id:'other',objectiveId:'other'}],[])).toEqual([task]);
  });

  it('displays real metadata and expands tasks; retries an activity failure', async () => {
    vi.spyOn(okrRepository,'events').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(<CompanyObjectiveDetail record={objective} records={[objective,child]} people={[{id:'boss',name:'制定人甲',department:'管理层',rootFlag:1,supervisorId:null,version:1},{id:'manager',name:'主管乙',department:'产品部',rootFlag:0,supervisorId:'boss',version:1}]} work={[task]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByLabelText('制定人：制定人甲')).toBeInTheDocument();
    expect(screen.getByText('目标详情')).toBeInTheDocument();
    expect(screen.getByText('/ 2026年10月')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改目标' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除目标' })).toBeDisabled();
    expect(screen.getByRole('group', { name: '目标操作' })).toBeInTheDocument();
    expect(screen.getByText('目标权重:40%')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByRole('main', {name:'目标与动作'})).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('complementary', {name:'所有记录'})).toHaveAttribute('tabindex', '0');
    expect(screen.getByLabelText('KR1进度：75%')).toBeInTheDocument();
    expect(screen.getByLabelText('KR1权重：100%')).toBeInTheDocument();
    for (const name of ['KR1关联任务', 'KR1项目', 'KR1产品', 'KR1下级对齐']) expect(screen.getByRole('button', {name})).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button',{name:'KR1关联任务'}));
    expect(screen.getByText('实际任务')).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'KR1关联任务'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', {name:'KR1关联任务'}));
    expect(screen.queryByText('实际任务')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'KR1关联任务'})).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', {name:'KR1关联任务'}));
    expect(screen.getByText('实际任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'KR1下级对齐'}));
    expect(screen.getByText('部门交付')).toBeInTheDocument();
    expect(screen.queryByText('实际任务')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'KR1项目'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'KR1产品'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'KR1收起关联内容'}));
    expect(screen.queryByText('部门交付')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'KR1展开关联内容'}));
    expect(screen.getByText('部门交付')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'KR1项目'}));
    expect(screen.getByText('暂无关联项目')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'KR1产品'}));
    expect(screen.getByText('暂无关联产品')).toBeInTheDocument();
    expect(await screen.findByText('动态记录加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
    expect(await screen.findByText('暂无动态记录')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('places enabled edit, delete and close actions in order and dispatches them', async () => {
    vi.spyOn(okrRepository, 'events').mockResolvedValue([]);
    const onEdit = vi.fn(), onDelete = vi.fn(), onClose = vi.fn();
    render(<CompanyObjectiveDetail record={objective} records={[objective]} people={[]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onEdit={onEdit} onDelete={onDelete} onClose={onClose}/>);
    const actions = screen.getByRole('group', {name: '目标操作'}).querySelectorAll('button');
    expect(Array.from(actions).map(button => button.getAttribute('aria-label'))).toEqual(['修改目标', '删除目标', '关闭目标详情']);
    fireEvent.click(actions[0]); fireEvent.click(actions[1]); fireEvent.click(actions[2]);
    expect(onEdit).toHaveBeenCalledOnce(); expect(onDelete).toHaveBeenCalledOnce(); expect(onClose).toHaveBeenCalledOnce();
    await screen.findByText('暂无动态记录');
    vi.restoreAllMocks();
  });

  it('inherits personal A business associations and omits assignee placeholders',async()=>{
    vi.spyOn(okrRepository,'events').mockResolvedValue([]);
    const record:OkrRecord={...objective,ownerId:'staff',payload:{title:'个人交付',goalLevel:'personal',origin:'assigned',keyResults:[{id:'kr',title:'项目产品计划',structureType:'delivery',businessObject:'项目甲',weight:100,progress:0,details:[{id:'p',name:'产品甲',stage:'交付'}],executionActions:[{id:'own',ownerId:'staff',title:'完成实施',progress:0,weight:100}]}]}};
    render(<CompanyObjectiveDetail record={record} records={[record]} people={[]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByRole('button',{name:'A1项目'})).toHaveTextContent('项目（1）');expect(screen.getByRole('button',{name:'A1产品'})).toHaveTextContent('产品（1）');
    expect(document.querySelector('.company-action-assignees')).toBeNull();
    expect(screen.getByLabelText('A1权重：100%').querySelector('.anticon-pie-chart')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'A1项目'}));expect(screen.getByText('项目甲')).toBeInTheDocument();await screen.findByText('暂无动态记录');vi.restoreAllMocks();
  });

  it('shows saved project and product associations beneath the shared toggle', async () => {
    vi.spyOn(okrRepository, 'events').mockResolvedValue([]);
    const linked = {...child, payload:{...child.payload,structureType:'delivery',businessObject:'交付项目甲',productLine:'产品甲'}};
    render(<CompanyObjectiveDetail record={objective} records={[objective,linked]} people={[]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name:'KR1项目'}));
    expect(screen.getByText('交付项目甲')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'KR1产品'}));
    expect(screen.getByText('产品甲')).toBeInTheDocument();
    expect(screen.queryByText('交付项目甲')).not.toBeInTheDocument();
    await screen.findByText('暂无动态记录');
    vi.restoreAllMocks();
  });
});


describe('personal autonomous details',()=>{
 it('renders actual A rows without exposing an internal KR container',()=>{
  vi.spyOn(okrRepository,'events').mockResolvedValue([]);
  const record:OkrRecord={id:'personal',kind:'objective',ownerId:'staff',periodKey:'2026-09',status:'active',version:1,payload:{goalLevel:'personal',origin:'autonomous',title:'个人自主目标',keyResults:[{id:'container',title:'个人自主目标',weight:100,progress:0,executionActions:[{id:'a',ownerId:'staff',title:'完成具体工作',weight:100,progress:30,deadline:'2026-09-25'}]}]}};
  render(<CompanyObjectiveDetail record={record} records={[record]} people={[]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
  expect(screen.queryByText('A1')).not.toBeInTheDocument();expect(screen.getByText('完成具体工作')).toBeInTheDocument();expect(screen.queryByText('KR1')).not.toBeInTheDocument();
 });
});
