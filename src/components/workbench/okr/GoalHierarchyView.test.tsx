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
    expect(root.children[0].children.map(node => node.id)).toEqual(['a11', 'a12']);
    expect(root.children[0].children[0].children[0].id).toBe('a111');
    expect(root.children[0].children[0].progress).toBe(80);
    expect(root.progress).toBe(68);
  });

  it('uses O1 for objectives and A1 for root actions', () => {
    const [root] = buildGoalHierarchy(records, '2026-09', undefined, people);
    expect(root.id).toBe('o1');
    expect(root.children[0].id).toBe('kr:o1:a1');
  });

  it('shows two levels initially and expands deeper branches on demand', () => {
    render(<GoalHierarchyView records={records} people={people} periodKey="2026-09" />);
    expect(screen.getByText('提升客户交付质量')).toBeInTheDocument();
    expect(screen.getByText('建立交付质量门禁')).toBeInTheDocument();
    expect(screen.queryByText('完成重点项目验收清单')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '展开 建立交付质量门禁' }));
    expect(screen.getByText('完成重点项目验收清单')).toBeInTheDocument();
    expect(screen.getByText('补齐质量复盘机制')).toBeInTheDocument();
    expect(screen.queryByText('核验交付验收证据')).not.toBeInTheDocument();
  });

  it('opens and closes the detail drawer with source chain and draft-only actions', async () => {
    const edit = vi.fn();
    const submit = vi.fn();
    render(<GoalHierarchyView records={records} people={people} periodKey="2026-09" onEditDraft={edit} onSubmitDraft={submit} />);
    fireEvent.click(screen.getByRole('button', { name: '展开 建立交付质量门禁' }));
    fireEvent.click(screen.getByRole('button', { name: '查看 补齐质量复盘机制' }));

    const detail = screen.getByRole('complementary', { name: '目标节点详情' });
    expect(detail).toBeInTheDocument();
    expect(screen.getByText('来源链路')).toBeInTheDocument();
    expect(within(detail).getByText('未指定承接人')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑草稿' }));
    expect(edit).toHaveBeenCalledWith(records[2]);
    await waitFor(() => expect(screen.queryByRole('complementary', { name: '目标节点详情' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '查看 补齐质量复盘机制' }));
    const reopenedDetail = screen.getByRole('complementary', { name: '目标节点详情' });
    fireEvent.click(within(reopenedDetail).getByRole('button', { name: /提\s*交/ }));
    expect(submit).toHaveBeenCalledWith(records[2]);
    fireEvent.click(within(reopenedDetail).getByRole('button', { name: '关闭详情' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: '目标节点详情' })).not.toBeInTheDocument());
  });

  it('renders loading, error, and empty states', () => {
    const { rerender } = render(<GoalHierarchyView records={[]} people={people} periodKey="2026-09" loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<GoalHierarchyView records={[]} people={people} periodKey="2026-09" error={new Error('offline')} />);
    expect(screen.getByText('目标关系加载失败')).toBeInTheDocument();
    expect(screen.getByText('当前周期暂无可展示的目标关系')).toBeInTheDocument();
  });

  it('shows an isolated four-level relationship demo for the boss view', () => {
    render(<GoalHierarchyView records={records} people={people} periodKey="2026-09" showDemoHierarchy />);

    const demo = screen.getByRole('region', { name: '四级目标关系演示' });
    expect(within(demo).getByText('关系演示')).toBeInTheDocument();
    expect(within(demo).getByText('公司月度目标')).toBeInTheDocument();
    expect(within(demo).getByText('老板关键动作')).toBeInTheDocument();
    expect(within(demo).getByText('主管拆解目标')).toBeInTheDocument();
    expect(within(demo).getByText('员工执行目标')).toBeInTheDocument();
    expect(within(demo).getByText(/不保存、不提交/)).toBeInTheDocument();
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
        status: 'draft',
        ownerNames: ['负责人'],
        progress: 0,
        actions: [{ id: 'session-a', title: '会话内行动', assigneeNames: ['部门主管'], progress: 0, weight: 100, deadline: '' }],
      }]}
    />);

    expect(screen.getByRole('button', { name: '查看 会话内拆解目标' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('会话内行动')).toBeInTheDocument();
  });
});
