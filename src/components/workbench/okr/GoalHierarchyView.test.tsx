// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
import { buildGoalHierarchy, GoalHierarchyView } from './GoalHierarchyView';

const people: OkrPerson[] = [
  { id: 'boss', name: '负责人', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '部门主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  { id: 'staff', name: '执行员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
];

const records: OkrRecord[] = [
  {
    id: 'o1', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 1,
    payload: { title: '提升客户交付质量', keyResults: [{ id: 'a1', title: '建立交付质量门禁', weight: 60, progress: 10, assigneeIds: ['manager'] }] },
  },
  {
    id: 'a11', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'active', version: 1,
    payload: { title: '完成重点项目验收清单', parentObjectiveId: 'o1', parentActionId: 'a1', parentKeyResultId: 'a1', weight: 70, progress: 20, assigneeIds: ['staff'], department: '产品部' },
  },
  {
    id: 'a12', kind: 'action', ownerId: 'manager', periodKey: '2026-09', status: 'draft', version: 1,
    payload: { title: '补齐质量复盘机制', parentObjectiveId: 'o1', parentActionId: 'a1', parentKeyResultId: 'a1', weight: 30, progress: 40, assigneeIds: [], department: '产品部' },
  },
  {
    id: 'a111', kind: 'action', ownerId: 'staff', periodKey: '2026-09', status: 'active', version: 1,
    payload: { title: '核验交付验收证据', parentObjectiveId: 'o1', parentActionId: 'a11', parentKeyResultId: 'a1', weight: 100, progress: 80, assigneeIds: [] },
  },
];

describe('GoalHierarchyView', () => {
  it('builds recursive O/A relations and aggregates direct children by weight', () => {
    const [root] = buildGoalHierarchy(records, '2026-09');
    expect(root.children[0].children.map(node => node.id)).toEqual(['a11']);
    expect(root.children[0].children[0].children[0].id).toBe('a111');
    expect(root.children[0].children[0].progress).toBe(80);
    expect(root.progress).toBe(80);
  });

  it('uses O1 for objectives and A1 for root actions', () => {
    const [root] = buildGoalHierarchy(records, '2026-09', undefined, people);
    expect(root.id).toBe('o1');
    expect(root.children[0].id).toBe('kr:o1:a1');
  });

  it('keeps real child actions under the parent without creating manager wrapper nodes', () => {
    const multiAssigneeRecords = records.map(record => record.id === 'o1'
      ? { ...record, payload: { ...record.payload, keyResults: [{ ...record.payload.keyResults![0], assigneeIds: ['manager', 'staff'] }] } }
      : record);
    const [root] = buildGoalHierarchy(multiAssigneeRecords, '2026-09', undefined, people);
    expect(root.children[0].children.map(node => node.id)).toEqual(['a11']);
    expect(root.children[0].children.some(node => node.id.startsWith('manager:'))).toBe(false);
  });

  it('marks a manager objective with the upstream owner in its metadata', () => {
    const managerObjective: OkrRecord = {
      id: 'manager-objective', kind: 'objective', ownerId: 'manager', periodKey: '2026-09', status: 'active', version: 1,
      payload: { title: '主管目标', parentObjectiveId: 'o1', keyResults: [] },
    };
    const [root] = buildGoalHierarchy([...records, managerObjective], '2026-09', 'manager', people);
    expect(root.objectiveLevel).toBe('主管级');
    expect(root.objectiveMetaOwnerId).toBe('boss');
  });

  it('deduplicates assignees on supplemental objective nodes', () => {
    render(<GoalHierarchyView
      records={records}
      people={people}
      periodKey="2026-09"
      ownerId="manager"
      supplementalTargets={[{
        id: 'session-dedup',
        title: '主管拆解目标',
        status: 'active',
        ownerNames: ['部门主管'],
        progress: 0,
        actions: [{ id: 'session-a', title: '测试动作', assigneeNames: ['执行员工', '执行员工'], progress: 0, weight: 100, deadline: '' }],
      }]}
    />);
    expect(screen.getByText('承接人员：执行员工')).toBeInTheDocument();
  });

  it('does not include draft supplemental actions in the submitted hierarchy', () => {
    render(<GoalHierarchyView
      records={records}
      people={people}
      periodKey="2026-09"
      ownerId="boss"
      supplementalTargets={[{
        id: 'draft-group',
        title: '主管拆解目标',
        status: 'draft',
        ownerNames: ['部门主管'],
        progress: 0,
          actions: [{ id: 'a12', title: '补齐质量复盘机制', assigneeNames: [], progress: 0, weight: 100, deadline: '2026-09-30' }],
      }]}
    />);
    expect(screen.queryByText('主管拆解目标')).not.toBeInTheDocument();
    expect(screen.queryByText('补齐质量复盘机制')).not.toBeInTheDocument();
  });

  it('shows two levels initially and expands deeper branches on demand', () => {
    render(<GoalHierarchyView records={records} people={people} periodKey="2026-09" />);
    expect(screen.getByText('提升客户交付质量')).toBeInTheDocument();
    expect(screen.getByText('建立交付质量门禁')).toBeInTheDocument();
    expect(screen.getByText('公司级')).toBeInTheDocument();
    expect(screen.getByText('负责人')).toBeInTheDocument();
    expect(screen.getAllByText('100%')).toHaveLength(2);
    expect(screen.getByText('@部门主管')).toBeInTheDocument();
    expect(screen.getByText('1 个下级动作')).toBeInTheDocument();
    expect(screen.getAllByText('进度').length).toBeGreaterThan(0);
    expect(screen.getAllByText('权重').length).toBeGreaterThan(0);
    expect(screen.getAllByText('截止日期').length).toBeGreaterThan(0);
    expect(screen.queryByText('完成重点项目验收清单')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '展开 建立交付质量门禁' }));
    expect(screen.getByText('完成重点项目验收清单')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开 完成重点项目验收清单' }));
    expect(screen.getByText('核验交付验收证据')).toBeInTheDocument();
    expect(screen.getByText('@执行员工')).toBeInTheDocument();
    const leafRow = screen.getByRole('button', { name: '查看 核验交付验收证据' }).closest('.goal-node-row');
    expect(leafRow).not.toHaveTextContent('承接人员');
    expect(leafRow).not.toHaveTextContent('下级动作');
  });

  it('opens and closes the detail drawer for submitted actions', async () => {
    const edit = vi.fn();
    const submit = vi.fn();
    render(<GoalHierarchyView records={records} people={people} periodKey="2026-09" onEditDraft={edit} onSubmitDraft={submit} />);
    fireEvent.click(screen.getByRole('button', { name: '展开 建立交付质量门禁' }));
    fireEvent.click(screen.getByRole('button', { name: '查看 完成重点项目验收清单' }));

    const detail = screen.getByRole('complementary', { name: '目标节点详情' });
    expect(detail).toBeInTheDocument();
    expect(screen.getByText('来源链路')).toBeInTheDocument();
    expect(within(detail).getByText('执行员工')).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: '编辑草稿' })).not.toBeInTheDocument();
    fireEvent.click(within(detail).getByRole('button', { name: '关闭详情' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: '目标节点详情' })).not.toBeInTheDocument());
    expect(edit).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('renders loading, error, and empty states', () => {
    const { rerender } = render(<GoalHierarchyView records={[]} people={people} periodKey="2026-09" loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<GoalHierarchyView records={[]} people={people} periodKey="2026-09" error={new Error('offline')} />);
    expect(screen.getByText('目标关系加载失败')).toBeInTheDocument();
    expect(screen.getByText('当前周期暂无可展示的目标关系')).toBeInTheDocument();
  });

  it('keeps session targets in the monthly tree and marks the opened objective as selected', () => {
    render(<GoalHierarchyView
      records={records}
      people={people}
      periodKey="2026-09"
      ownerId="boss"
      initialSelectedId="session-o"
      supplementalTargets={[{
        id: 'session-o',
        title: '会话内拆解目标',
        status: 'active',
        ownerNames: ['负责人'],
        progress: 0,
        actions: [{ id: 'session-a', title: '会话内行动', assigneeNames: ['部门主管'], progress: 0, weight: 100, deadline: '' }],
      }]}
    />);

    expect(screen.getByRole('button', { name: '查看 会话内拆解目标' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('会话内行动')).toBeInTheDocument();
  });
});
