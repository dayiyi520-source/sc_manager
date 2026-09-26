// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('uses the breakdown owner for level and the upstream owner for creator', () => {
    const people: OkrPerson[] = [
      { id: 'boss', name: '林志豪', department: '管理部', supervisorId: null, rootFlag: 1, version: 1 },
      { id: 'manager', name: '陈宇璋', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
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
    const people: OkrPerson[] = [{ id: 'manager', name: '陈宇璋', department: '产品部', supervisorId: null, rootFlag: 0, version: 1 }];
    const records: OkrRecord[] = [
      { id: 'submitted', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'active', version: 1, payload: { title: '已提交动作', parentObjectiveId: 'o1', parentActionId: 'parent' } },
      { id: 'draft', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'draft', version: 1, payload: { title: '草稿动作', parentObjectiveId: 'o1', parentActionId: 'parent' } },
    ];

    const target = buildMyTargetViewItems(records, [], [], people, 'manager').find(item => item.id === 'action-group-parent');
    expect(target?.status).toBe('draft');
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
    expect(within(draftCard).getByText('当前进度：0%')).toBeInTheDocument();
    expect(within(draftCard).getByText('截止日期：09-30')).toBeInTheDocument();
    expect(within(activeCard).queryByText('已提交')).not.toBeInTheDocument();
    expect(within(activeCard).getByText('当前进度：42%')).toBeInTheDocument();
    expect(within(activeCard).getByText('截止日期：09-28')).toBeInTheDocument();
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
