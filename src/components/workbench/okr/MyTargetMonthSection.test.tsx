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
    expect(screen.queryByText('查看详情')).not.toBeInTheDocument();
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
    expect(buildMyTargetViewItems([child], [], [parent], people, 'boss')[0].alignmentLabel).toBe('来源目标');
    expect(buildMyTargetViewItems([parent], [], [], people, 'boss')[0].alignmentLabel).toBe('2026年09月目标');
    expect(buildMyTargetViewItems([child], [], [parent], people, 'another-user')[0].editable).toBe(false);
  });

  it('shows only submitted lower alignments from the same period and previews their actions', async () => {
    const people: OkrPerson[] = [{ id: 'staff', name: '张瑶', department: '设计部', supervisorId: 'boss', rootFlag: 0, version: 1 }];
    const objective: OkrRecord = { id: 'o1', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '公司目标', keyResults: [{ id: 'a1', title: '上级动作', weight: 100, progress: 0 }] } };
    const child: OkrRecord = { id: 'child', kind: 'action', ownerId: 'staff', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '交付设计方案', parentObjectiveId: 'o1', parentActionId: 'a1', weight: 100, progress: 50 } };
    const result = buildMyTargetViewItems([objective], [], [child, { ...child, id: 'draft', status: 'draft' }, { ...child, id: 'old', periodKey: '2026-08' }], people, 'boss');
    expect(result[0].actions[0].alignments).toHaveLength(1);
    expect(result[0].actions[0].alignments?.[0].actions).toEqual([{ id: 'child', title: '交付设计方案', linked: true }]);
    render(<MyTargetMonthSection periodKey="2026-09" targets={result} viewMode="list" collapsed={false} onToggle={vi.fn()} onOpenTarget={vi.fn()}/>);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'A1下级对齐' }));
    await waitFor(() => expect(screen.getByText('交付设计方案')).toBeInTheDocument());
    expect(screen.getByText('对齐我的')).toBeInTheDocument();
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
    expect(target.levelLabel).toBe('主管级');
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

  it('delegates month collapse and target detail actions', () => {
    const onToggle = vi.fn();
    const onOpenTarget = vi.fn();
    const { rerender } = render(<MyTargetMonthSection periodKey="2026-09" targets={targets} viewMode="list" collapsed={false} onToggle={onToggle} onOpenTarget={onOpenTarget} />);

    fireEvent.click(screen.getByRole('button', { name: '收起2026年09月' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('目标：完善客户交付方案'));
    expect(onOpenTarget).toHaveBeenCalledWith('draft-target');
    fireEvent.keyDown(screen.getByLabelText('目标：推进平台智能化能力建设'), { key: 'Enter' });
    expect(onOpenTarget).toHaveBeenCalledWith('active-target');

    rerender(<MyTargetMonthSection periodKey="2026-09" targets={targets} viewMode="list" collapsed onToggle={onToggle} onOpenTarget={onOpenTarget} />);
    expect(screen.queryByLabelText('目标：完善客户交付方案')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '展开2026年09月' })).toBeInTheDocument();
  });
});
