// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionBreakdownForm } from './ActionBreakdownForm';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';

const people: OkrPerson[] = [
  {id: 'me', name: '产品主管', department: '产研部门', supervisorId: 'boss', rootFlag: 0, version: 0},
  {id: 'member', name: '产品成员', department: '产研部门', supervisorId: 'me', rootFlag: 0, version: 0},
];

const parents: OkrRecord[] = [{
  id: 'parent-action', kind: 'action', ownerId: 'boss', periodKey: '2026-09', status: 'active', version: 0,
  payload: {title: '提升客户满意度', parentObjectiveId: 'objective-1', parentActionId: 'parent-action'},
}];

describe('ActionBreakdownForm', () => {
  it('shows parent actions and product department structured fields', () => {
    render(<ActionBreakdownForm open cycle="2026-09" person={people[0]} parents={parents} actions={[]} people={people} busy={false} onClose={vi.fn()} onSave={vi.fn(async () => undefined)} />);

    expect(screen.getByText('2026年09月')).toBeInTheDocument();
    expect(screen.getByText('提升客户满意度')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '拆解目标'}));
    expect(screen.queryByLabelText('输入动作')).not.toBeInTheDocument();
    expect(screen.getByText('尚未添加 A，点击“添加 A”开始拆解')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '添加 A'}));
    expect(screen.getByLabelText('输入动作')).toBeInTheDocument();
    expect(screen.getByLabelText('关联产品线')).toBeInTheDocument();
    expect(screen.getByLabelText('关键节点')).toBeInTheDocument();
    expect(screen.getByText('承接人员（可多选）')).toBeInTheDocument();
  });

  it('adds multiple blank actions without per-action collapse controls', () => {
    render(<ActionBreakdownForm open cycle="2026-09" person={people[0]} parents={parents} actions={[]} people={people} busy={false} onClose={vi.fn()} onSave={vi.fn(async () => undefined)} />);

    fireEvent.click(screen.getByRole('button', {name: '拆解目标'}));
    fireEvent.click(screen.getByRole('button', {name: '添加 A'}));
    fireEvent.click(screen.getByRole('button', {name: '添加 A'}));
    expect(screen.getByText('关键动作 2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: '收起'})).toHaveLength(1);
  }, 15000);

  it('opens a saved draft with its actual parent and does not show a new-action chooser', async () => {
    const draft: OkrRecord = {
      id: 'draft-1', kind: 'action', ownerId: 'me', periodKey: '2026-09', status: 'draft', version: 2,
      payload: {title: '已保存的草稿', department: '产研部门', parentObjectiveId: 'objective-1', parentActionId: 'parent-action', parentKeyResultId: 'kr-1', structureType: 'product', productLine: '平台', milestone: '评审完成', deadline: '2026-09-30', weight: 60},
    };
    render(<ActionBreakdownForm open cycle="2026-09" person={people[0]} parents={parents} actions={[draft]} people={people} busy={false} initialActionId={draft.id} onClose={vi.fn()} onSave={vi.fn(async () => true)} />);

    expect(await screen.findByDisplayValue('已保存的草稿')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: '拆解目标'})).not.toBeInTheDocument();
    expect(screen.getByText('提升客户满意度')).toBeInTheDocument();
    expect(screen.getByLabelText('关联产品线')).toHaveValue('平台');
  });
});
