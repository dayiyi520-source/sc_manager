// @vitest-environment jsdom
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildMyTargetViewItems, MyTargetMonthSection, type MyTargetViewItem } from './MyTargetMonthSection';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';

const targets: MyTargetViewItem[] = [
  {
    id: 'draft-target',
    detailId: 'draft-target',
    title: '完善客户交付方案',
    status: 'draft',
    ownerNames: ['林志豪'],
    maxDeadline: '2026-09-30',
    progress: 0,
    savedAt: '2026-09-24T08:00:00',
    actions: [{ id: 'draft-action', title: '梳理交付清单', assigneeNames: ['刘爱剑'], progress: 0, weight: 100, deadline: '2026-09-30' }],
  },
  {
    id: 'active-target',
    detailId: 'active-target',
    title: '推进平台智能化能力建设',
    status: 'active',
    sourceName: '直属上级 · 陈宇璋',
    ownerNames: ['林志豪'],
    maxDeadline: '2026-09-28',
    progress: 42,
    savedAt: '2026-09-20T08:00:00',
    actions: [{ id: 'active-action', title: '上线智能分析节点', assigneeNames: ['吴清', '刘笑星'], progress: 42, weight: 100, deadline: '2026-09-28' }],
  },
  {
    id: 'session-target',
    title: '会话内拆解目标',
    status: 'draft',
    ownerNames: ['林志豪'],
    progress: 0,
    savedAt: '2026-09-24T09:00:00',
    actions: [],
  },
];

describe('MyTargetMonthSection', () => {
  it('opens progress without opening detail and excludes drafts from weighted period progress', () => {
    const open = vi.fn(), progress = vi.fn();
    render(<MyTargetMonthSection periodKey="2026-10" targets={[
      {...targets[1], objectiveWeight:20, progress:25},
      {...targets[1], id:'second', objectiveWeight:80, progress:75, actions:[]},
      {...targets[0], objectiveWeight:100, progress:100},
      {...targets[1], id:'initial', initialPending:true, progress:100, actions:[]},
    ]} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={open} onProgress={progress}/>);
    expect(screen.getByLabelText('本周期整体进度：65%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'查看A1进度'}));
    expect(progress).toHaveBeenCalledWith('active-target','active-action');
    expect(open).not.toHaveBeenCalled();
  });

  it.each(['list','card'] as const)('pending %s only offers withdrawal and shows A metrics', async viewMode => {
    const onDelete=vi.fn(),onOpen=vi.fn();
    const target={...targets[0],awaitingApproval:true,editable:false,deletable:true,actions:[{...targets[0].actions[0],executionActions:[{id:'a',title:'设计动作',weight:60,progress:25,deadline:'2026-10-20'}]}]};
    render(<MyTargetMonthSection periodKey="2026-10" targets={[target]} viewMode={viewMode} collapsed={false} onToggle={vi.fn()} onOpenTarget={onOpen} onDeleteTarget={onDelete}/>);
    expect(screen.queryByLabelText(`编辑目标：${target.title}`)).not.toBeInTheDocument();
    if (viewMode === 'list') {
      expect(screen.getByText('设计动作')).toBeInTheDocument();
    } else {
      expect(screen.queryByText('设计动作')).not.toBeInTheDocument();
      expect(screen.queryByText('10-20')).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByLabelText(`更多操作：${target.title}`));
    fireEvent.click(await screen.findByRole('menuitem',{name:'撤回'}));
    expect(onDelete).toHaveBeenCalledWith(target.id);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('excludes the current owner and displays lower record owners rather than assigned managers', () => {
    const people: OkrPerson[] = [
      {id:'manager',name:'陈宇璋',jobTitle:'产品主管',department:'产品部',rootFlag:0,supervisorId:'boss',version:1},
      {id:'staff',name:'下级成员',department:'产品部',rootFlag:0,supervisorId:'manager',version:1},
    ];
    const objective: OkrRecord = {id:'o',kind:'objective',ownerId:'manager',periodKey:'2026-09',status:'active',version:1,payload:{title:'主管目标',keyResults:[{id:'a',title:'主管动作',weight:100,progress:0}]}};
    const own: OkrRecord = {id:'own',kind:'action',ownerId:'manager',periodKey:'2026-09',status:'active',version:1,payload:{title:'自身拆解',parentActionId:'a',parentObjectiveId:'o'}};
    const lower = {...own,id:'lower',ownerId:'staff',payload:{...own.payload,title:'成员动作',assigneeIds:['manager']}};
    const lowerObjective = {...objective,id:'lower-o',ownerId:'staff',payload:{title:'成员目标',alignments:[{parentObjectiveId:'o',parentKeyResultId:'a'}]}};
    const rows = buildMyTargetViewItems([objective], [], [own,lower,lowerObjective], people, 'manager')[0].actions[0].alignments!;
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.ownerName)).toEqual(['下级成员','下级成员']);
    expect(rows.flatMap(row => row.actions).some(action => action.id === 'own')).toBe(false);
  });

  it('shows alignment content and handles toolbar actions without opening the row', async () => {
    const onOpenTarget = vi.fn();
    const onEditTarget = vi.fn();
    const onDeleteTarget = vi.fn();
    const target = { ...targets[1], editable: true, deletable: true, alignmentLabel: '2026年09月目标' };
    render(<MyTargetMonthSection periodKey="2026-09" targets={[target]} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={onOpenTarget} onEditTarget={onEditTarget} onDeleteTarget={onDeleteTarget}/>);
    expect(screen.getByText('2026年09月目标')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `编辑目标：${target.title}` }));
    expect(onEditTarget).toHaveBeenCalledWith(target.id);
    expect(onOpenTarget).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: `更多操作：${target.title}` }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: '删除' })).toBeInTheDocument());
    expect(screen.getByRole('menuitem', {name:'查看详情'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '删除' }));
    expect(onDeleteTarget).toHaveBeenCalledWith(target.id);
    expect(onOpenTarget).not.toHaveBeenCalled();
  });

  it('supports card editing and deletion without opening details and shows progress only below', async () => {
    const onOpenTarget = vi.fn();
    const onEditTarget = vi.fn();
    const onDeleteTarget = vi.fn();
    const target = { ...targets[1], editable: true, deletable: true };
    render(<MyTargetMonthSection periodKey="2026-09" targets={[target]} viewMode="card" collapsed={false} onToggle={vi.fn()} onOpenTarget={onOpenTarget} onEditTarget={onEditTarget} onDeleteTarget={onDeleteTarget}/>);
    const card = screen.getByLabelText(`目标卡片：${target.title}`);
    expect(within(card).getAllByText('42%')).toHaveLength(1);
    fireEvent.click(within(card).getByRole('button', { name: `编辑目标：${target.title}` }));
    expect(onEditTarget).toHaveBeenCalledWith(target.id);
    fireEvent.click(within(card).getByRole('button', { name: `更多操作：${target.title}` }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '删除' }));
    expect(onDeleteTarget).toHaveBeenCalledWith(target.id);
    expect(onOpenTarget).not.toHaveBeenCalled();
  });

  it('uses the same aligned objective titles and monthly fallback as the detail page', () => {
    const people: OkrPerson[] = [{ id: 'boss', name: '林志豪', department: '管理部', supervisorId: null, rootFlag: 1, version: 1 }];
    const parent: OkrRecord = { id: 'parent-objective', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '来源目标' } };
    const child: OkrRecord = { ...parent, id: 'child-objective', payload: { title: '当前目标', alignments: [{ parentObjectiveId: parent.id }] } };
    expect(buildMyTargetViewItems([child], [], [parent], people, 'boss')[0].alignmentLabel).toBe('来源目标——来源于上级林志豪');
    expect(buildMyTargetViewItems([parent], [], [], people, 'boss')[0].alignmentLabel).toBe('2026年09月目标');
    expect(buildMyTargetViewItems([child], [], [parent], people, 'another-user')[0].editable).toBe(false);
  });

  it('shows only submitted lower alignments from the same period and previews their actions', async () => {
    const people: OkrPerson[] = [{ id: 'staff', name: '张瑶', department: '设计部', supervisorId: 'boss', rootFlag: 0, version: 1 }];
    const objective: OkrRecord = { id: 'o1', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '公司目标', keyResults: [{ id: 'a1', title: '上级动作', weight: 100, progress: 0 }] } };
    const child: OkrRecord = { id: 'child', kind: 'action', ownerId: 'staff', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '交付设计方案', parentObjectiveId: 'o1', parentActionId: 'a1', weight: 100, progress: 50 } };
    const result = buildMyTargetViewItems([objective], [], [child, { ...child, id: 'draft', status: 'draft' }, { ...child, id: 'old', periodKey: '2026-08' }], people, 'boss');
    expect(result[0].actions[0].alignments).toHaveLength(1);
    expect(result[0].actions[0].alignments?.[0].actions).toMatchObject([{ id: 'child', title: '交付设计方案', linked: true, progress: 50, targetId: 'child' }]);
    const onOpenAlignment = vi.fn();
    render(<MyTargetMonthSection periodKey="2026-09" targets={result} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} onOpenAlignment={onOpenAlignment}/>);
    fireEvent.click(screen.getByRole('button', { name: 'KR1下级对齐' }));
    await waitFor(() => expect(screen.getByText('交付设计方案')).toBeInTheDocument());
    expect(screen.getByText('对齐我的')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /交付设计方案50% · 张瑶/ }));
    expect(onOpenAlignment).toHaveBeenCalledWith('child');
  });

  it('shows manager KR numbering under company alignment and personal plan actions before manager O', async () => {
    const people: OkrPerson[] = [
      { id:'boss', name:'老板', department:'管理部', supervisorId:null, rootFlag:1, version:1 },
      { id:'manager', name:'主管', jobTitle:'产品主管', department:'产品部', supervisorId:'boss', rootFlag:0, version:1 },
      { id:'staff', name:'员工', department:'产品部', supervisorId:'manager', rootFlag:0, version:1 },
    ];
    const company: OkrRecord = { id:'company', kind:'objective', ownerId:'boss', periodKey:'2026-10', status:'active', version:1, payload:{ title:'公司目标', keyResults:[{id:'company-kr',title:'公司KR',weight:100,progress:0}] } };
    const manager: OkrRecord = { id:'manager', kind:'objective', ownerId:'manager', periodKey:'2026-10', status:'active', version:1, payload:{ title:'主管目标',goalLevel:'department',alignments:[{parentObjectiveId:'company',parentKeyResultId:'company-kr'}],keyResults:[{id:'manager-kr',title:'主管KR',weight:100,progress:0}] } };
    const staff: OkrRecord = { id:'staff', kind:'objective', ownerId:'staff', periodKey:'2026-10', status:'active', version:1, payload:{ title:'员工目标',goalLevel:'personal',sourceObjectiveId:'manager',sourceKrId:'manager-kr',keyResults:[{id:'manager-kr',title:'继承的主管KR',weight:100,progress:0,executionActions:[{id:'plan',ownerId:'staff',title:'员工编写的计划动作',progress:40}]}] } };
    const openAlignment=vi.fn();
    const companyView=buildMyTargetViewItems([company],[],[company,manager,staff],people,'boss');
    const view=render(<MyTargetMonthSection periodKey="2026-10" targets={companyView} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} onOpenAlignment={openAlignment}/>);
    fireEvent.click(screen.getByRole('button',{name:'KR1下级对齐'}));
    expect(await screen.findByText('主管KR')).toBeInTheDocument();
    expect(screen.getByText('KR1',{selector:'.okr-target-alignment-index'})).toBeInTheDocument();
    view.unmount();
    const managerView=buildMyTargetViewItems([manager],[],[company,manager,staff],people,'manager');
    render(<MyTargetMonthSection periodKey="2026-10" targets={managerView} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} onOpenAlignment={openAlignment}/>);
    const heading=screen.getByRole('heading',{name:'主管目标'}).parentElement!;
    expect(heading.querySelector('.okr-target-action-alignment')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'KR1下级对齐'}));
    expect(await screen.findByText('员工编写的计划动作')).toBeInTheDocument();
    expect(screen.queryByText('继承的主管KR')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/员工编写的计划动作40% · 员工/}));
    expect(openAlignment).toHaveBeenCalledWith('staff');
  });

  it('keeps list alignment on KR and shows department for manager and employee', () => {
    const people:OkrPerson[]=[{id:'boss',name:'老板',department:'管理部',rootFlag:1,supervisorId:null,version:1},{id:'manager',name:'主管',jobTitle:'产品主管',department:'产品部',rootFlag:0,supervisorId:'boss',version:1},{id:'staff',name:'员工',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
    const manager:OkrRecord={id:'manager',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{title:'主管目标',goalLevel:'department',keyResults:[{id:'k',title:'历史文字',weight:100,progress:0,structureType:'product',details:[{id:'d',name:'产品A',version:'V1'}]}]}};
    const staff:OkrRecord={id:'staff',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:1,payload:{title:'个人目标',goalLevel:'personal',sourceObjectiveId:'manager',sourceKrId:'k',keyResults:[{id:'k',title:'继承文字',weight:100,progress:0,executionActions:[{id:'a',ownerId:'staff',title:'本人计划',progress:0}]}]}};
    const rows=buildMyTargetViewItems([manager,staff],[],[manager,staff],people,'manager');
    const {container}=render(<MyTargetMonthSection periodKey="2026-10" targets={rows} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()}/>);
    expect(screen.getByText('按期完成1个产品版本迭代计划 · 达到对应的验收阶段')).toBeInTheDocument();
    expect(screen.getAllByText('产品部',{selector:'.okr-target-meta-line .ant-tag'})).toHaveLength(2);
    expect(container.querySelector('.okr-target-title-line .okr-target-action-alignment')).not.toBeInTheDocument();
  });
  it('uses the breakdown owner for level and the upstream owner for creator', () => {
    const people: OkrPerson[] = [
      { id: 'boss', name: '林志豪', department: '管理部', supervisorId: null, rootFlag: 1, version: 1 },
      { id: 'manager', name: '陈宇璋', jobTitle: '产品主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
      { id: 'staff', name: '毛景强', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
    ];
    const records: OkrRecord[] = [
      { id: 'parent', kind: 'action', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '产研动作', parentObjectiveId: 'o1', parentActionId: '' } },
      { id: 'child', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '测试1', parentObjectiveId: 'o1', parentActionId: 'parent', assigneeIds: ['staff', 'staff'], weight: 100 } },
    ];
    const target = buildMyTargetViewItems(records, [], [], people, 'manager').find(item => item.actions.some(action => action.title === '测试1'))!;
    expect(target.levelLabel).toBe('部门级');
    expect(target.creatorName).toBe('陈宇璋');
    expect(target.ownerNames).toEqual(['毛景强']);
  });

  it('keeps the objective deadline when its actions have no deadline', () => {
    const people: OkrPerson[] = [{ id: 'boss', name: '林志豪', department: '管理部', supervisorId: null, rootFlag: 1, version: 1 }];
    const records: OkrRecord[] = [{
      id: 'objective-with-deadline', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 1,
      payload: { title: '带截止时间的目标', deadline: '2026-09-30', keyResults: [] },
    }];

    expect(buildMyTargetViewItems(records, [], [], people, 'boss')[0].maxDeadline).toBe('2026-09-30');
  });

  it('binds mixed action groups to the draft record for editing', () => {
    const people: OkrPerson[] = [{ id: 'manager', name: '陈宇璋', jobTitle: '产品主管', department: '产品部', supervisorId: null, rootFlag: 0, version: 1 }];
    const records: OkrRecord[] = [
      { id: 'submitted', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '已提交动作', parentObjectiveId: 'o1', parentActionId: 'parent' } },
      { id: 'draft', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'draft', version: 1, payload: { title: '草稿动作', parentObjectiveId: 'o1', parentActionId: 'parent' } },
    ];

    const target = buildMyTargetViewItems(records, [], [], people, 'manager').find(item => item.id === 'action-group-parent');
    expect(target?.status).toBe('partial-draft');
    expect(target?.detailId).toBe('draft');
  });

  it('renders the list view as complete objective units with source, owners, and action fields', () => {
    render(<MyTargetMonthSection periodKey="2020-01" targets={targets} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} />);

    expect(screen.getByText('2020年01月')).toBeInTheDocument();
    expect(screen.getByText('周期已结束')).toBeInTheDocument();
    expect(screen.getByText('直属上级 · 陈宇璋')).toBeInTheDocument();
    const activeTarget = screen.getByLabelText('目标：推进平台智能化能力建设');
    expect(within(activeTarget).getByText('承接人员：林志豪')).toBeInTheDocument();
    expect(within(activeTarget).getAllByText('42%')).toHaveLength(2);
    expect(within(activeTarget).getByText('上线智能分析节点')).toBeInTheDocument();
    expect(within(activeTarget).getByText('@吴清 @刘笑星')).toBeInTheDocument();
    expect(within(activeTarget).getAllByText('100%').length).toBeGreaterThan(0);
    expect(within(activeTarget).getAllByText('09-28').length).toBeGreaterThan(0);
    expect(within(screen.getByLabelText('目标：完善客户交付方案')).getAllByText('0%').length).toBeGreaterThan(0);
  });

  it('shows draft state only for draft cards and uses distinct saved or submitted dates', () => {
    render(<MyTargetMonthSection periodKey="2026-09" targets={targets} viewMode="card" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} />);

    const draftCard = screen.getByLabelText('目标卡片：完善客户交付方案');
    const activeCard = screen.getByLabelText('目标卡片：推进平台智能化能力建设');
    expect(within(draftCard).getByText('草稿')).toBeInTheDocument();
    expect(within(draftCard).getByText('当前进度：')).toHaveTextContent('当前进度：0%');
    expect(within(draftCard).getByText('截止日期：09-30')).toBeInTheDocument();
    expect(within(activeCard).queryByText('已提交')).not.toBeInTheDocument();
    expect(within(activeCard).getByText('当前进度：')).toHaveTextContent('当前进度：42%');
    expect(within(activeCard).getByText('截止日期：09-28')).toBeInTheDocument();
    expect(within(activeCard).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(activeCard).getByText('@吴清 @刘笑星')).toBeInTheDocument();
    expect(within(activeCard).queryByText('来源自上级 · 陈宇璋')).not.toBeInTheDocument();
    expect(within(activeCard).getByText('42%')).toBeInTheDocument();
    expect(within(activeCard).queryByText('另有')).not.toBeInTheDocument();
  });

  it('opens detail only from the menu and preserves month collapse', async () => {
    const onToggle = vi.fn();
    const onOpenTarget = vi.fn();
    const { rerender } = render(<MyTargetMonthSection periodKey="2026-09" targets={targets} viewMode="list" collapsed={false} onToggle={onToggle} onOpenTarget={onOpenTarget} />);

    fireEvent.click(screen.getByRole('button', { name: '收起2026年09月' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('目标：完善客户交付方案'));
    expect(onOpenTarget).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('更多操作：完善客户交付方案'));
    fireEvent.click(await screen.findByRole('menuitem', { name: '查看详情' }));
    expect(onOpenTarget).toHaveBeenCalledWith('draft-target');
    fireEvent.keyDown(screen.getByLabelText('目标：推进平台智能化能力建设'), { key: 'Enter' });
    expect(onOpenTarget).toHaveBeenCalledTimes(1);

    rerender(<MyTargetMonthSection periodKey="2026-09" targets={targets} viewMode="list" collapsed onToggle={onToggle} onOpenTarget={onOpenTarget} />);
    expect(screen.queryByLabelText('目标：完善客户交付方案')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '展开2026年09月' })).toBeInTheDocument();
  });
});


describe('我的目标空月份操作', () => {
  it('shows supported actions without objective copy', () => {
    const add = vi.fn();
    render(<MyTargetMonthSection periodKey="2026-10" targets={[]} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} onAddGoal={add} />);
    fireEvent.click(screen.getByRole('button', { name: '添加目标' }));
    expect(screen.queryByRole('button', { name: '复制目标' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '目标模板' })).not.toBeInTheDocument();
    expect(add).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('模板导入')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-empty-image')).toBeInTheDocument();
  });
  it('disables actions when busy and hides creation in read-only scopes', () => {
    const props = { periodKey: '2026-10', targets: [], viewMode: 'list' as const, collapsed: false, onToggle: vi.fn(), onOpenTarget: vi.fn() };
    const { rerender } = render(<MyTargetMonthSection {...props} busy onAddGoal={vi.fn()} />);
    expect(screen.getByRole('button', { name: '添加目标' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '复制目标' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '目标模板' })).not.toBeInTheDocument();
    rerender(<MyTargetMonthSection {...props}/>);
    expect(screen.queryByRole('button', { name: '添加目标' })).not.toBeInTheDocument();
  });
});


describe('月份目标创建入口和草稿提示', () => {
  it.each(['list', 'card'] as const)('shows period draft feedback before targets and only add buttons in %s view', async viewMode => {
    const add = vi.fn(), submit = vi.fn().mockResolvedValue(undefined);
    const {container,rerender}=render(<MyTargetMonthSection periodKey="2026-10" targets={targets} viewMode={viewMode} collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} onAddGoal={add} draftCount={1} onSubmitDrafts={submit}/>);
    const notice=screen.getByText('你有 1 个草稿未提交确认').closest('.ant-alert')!;
    const target=container.querySelector(viewMode === 'list' ? '.okr-target-list' : '.okr-target-grid')!;
    expect(notice.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'添加目标'}));expect(screen.queryByRole('button',{name:'复制目标'})).not.toBeInTheDocument();
    expect(add).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:/提\s*交/})); await waitFor(()=>expect(submit).toHaveBeenCalledOnce());
    rerender(<MyTargetMonthSection periodKey="2026-10" targets={targets} viewMode={viewMode} collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()} onAddGoal={add} draftCount={0}/>);
    expect(screen.queryByText('你有 1 个草稿未提交确认')).not.toBeInTheDocument();
  });
});


describe('personal autonomous target presentation',()=>{
 it('shows own execution actions directly without a repeated hidden KR',()=>{
  const record:OkrRecord={id:'personal',kind:'objective',ownerId:'staff',periodKey:'2026-09',status:'active',version:1,payload:{goalLevel:'personal',origin:'autonomous',title:'个人自主目标',keyResults:[{id:'container',title:'个人自主目标',weight:100,progress:0,executionActions:[{id:'a',ownerId:'staff',title:'完成具体工作',weight:100,progress:30,deadline:'2026-09-25'}]}]}};
  const result=buildMyTargetViewItems([record],[],[record],[],'staff')[0];
  expect(result.actions).toHaveLength(1);expect(result.actions[0]).toMatchObject({id:'a',label:'A',title:'完成具体工作',progress:30,weight:100});
 });
});

it('shows personal actions without visible A numbering in the target list', () => {
  const record: OkrRecord = { id: 'personal', kind: 'objective', ownerId: 'staff', periodKey: '2026-09', status: 'active', version: 1, payload: { goalLevel: 'personal', origin: 'autonomous', title: '个人目标', keyResults: [{ id: 'container', title: '个人目标', weight: 100, progress: 0, executionActions: [{ id: 'a', ownerId: 'staff', title: '完成具体工作', weight: 100, progress: 30 }] }] } };
  render(<MyTargetMonthSection periodKey="2026-09" targets={buildMyTargetViewItems([record], [], [record], [], 'staff')} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()}/>);
  expect(screen.getByText('完成具体工作')).toBeInTheDocument();
  expect(screen.queryByText('A1')).not.toBeInTheDocument();
});

it.each(['list', 'card'] as const)('allows read-only %s targets to open details from the menu only', async viewMode => {
  const open = vi.fn(); const target = {...targets[0], editable:false, deletable:false};
  render(<MyTargetMonthSection periodKey="2026-09" targets={[target]} viewMode={viewMode} collapsed={false} onToggle={vi.fn()} onOpenTarget={open}/>);
  fireEvent.click(screen.getByLabelText(`${viewMode === 'list' ? '目标' : '目标卡片'}：${target.title}`));
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText(`更多操作：${target.title}`));
  fireEvent.click(await screen.findByRole('menuitem',{name:'查看详情'}));
  expect(open).toHaveBeenCalledWith(target.id);
  expect(screen.queryByRole('menuitem',{name:'删除'})).not.toBeInTheDocument();
});

it('shows assigned personal execution content in card view',()=>{
 const goal:OkrRecord={id:'assigned',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:1,payload:{goalLevel:'personal',origin:'assigned',title:'上级KR',keyResults:[{id:'kr',title:'上级KR',weight:100,progress:0,executionActions:[{id:'a',ownerId:'staff',title:'本人计划动作',weight:100,progress:25}]}]}};
 render(<MyTargetMonthSection periodKey="2026-10" targets={buildMyTargetViewItems([goal],[],[goal],[],'staff')} viewMode="card" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()}/>);
 expect(screen.getByText('本人计划动作')).toBeInTheDocument();expect(screen.queryByText('暂无拆解行动')).not.toBeInTheDocument();
});

it('shows all source KR assignees and each latest sub KR assignment in the employee list', () => {
  const people: OkrPerson[] = ['m', 'a', 'b'].map(id => ({ id, name: `姓名${id}`, department: '研发', supervisorId: id === 'm' ? null : 'm', rootFlag: id === 'm' ? 1 : 0, version: 1 }));
  const source: OkrRecord = { id: 'dept', kind: 'objective', ownerId: 'm', periodKey: '2026-10', status: 'active', version: 2, payload: { title: '部门O', goalLevel: 'department', keyResults: [{ id: 'kr', title: '部门KR', weight: 100, progress: 0, assigneeIds: ['a', 'b'], details: [{ id: 'one', name: '甲', assigneeIds: ['a'] }, { id: 'two', name: '乙', assigneeIds: ['b'] }] }] } };
  const personal: OkrRecord = { id: 'personal', kind: 'objective', ownerId: 'a', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '个人承接', goalLevel: 'personal', sourceObjectiveId: 'dept', sourceKrId: 'kr', keyResults: [{ id: 'kr', title: '部门KR', progress: 0, weight: 100, assigneeIds: ['a'], details: [{ id: 'one', name: '甲' }] }] } };
  const targets = buildMyTargetViewItems([personal], [], [source], people, 'a');
  expect(targets[0].ownerNames).toEqual(['姓名a', '姓名b']);
  render(<MyTargetMonthSection periodKey="2026-10" targets={targets} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()}/>);
  expect(screen.getByText('承接人员：姓名a、姓名b')).toBeInTheDocument();
  expect(within(screen.getByText('乙').closest('tr')!).getByText('姓名b')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

it('opens objective history from the list progress without opening details', () => {
  const onProgress = vi.fn(), onOpenTarget = vi.fn();
  render(<MyTargetMonthSection periodKey="2026-09" targets={[targets[1]]} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={onOpenTarget} onProgress={onProgress}/>);
  fireEvent.click(screen.getByRole('button', { name: `查看目标进度历史：${targets[1].title}` }));
  expect(onProgress).toHaveBeenCalledWith('active-target', 'active-target');
  expect(onOpenTarget).not.toHaveBeenCalled();
});
