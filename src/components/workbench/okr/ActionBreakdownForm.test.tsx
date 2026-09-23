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
    fireEvent.click(screen.getByRole('button', {name: '拆解动作'}));
    expect(screen.getByLabelText('输入动作')).toBeInTheDocument();
    expect(screen.getByLabelText('关联产品线')).toBeInTheDocument();
    expect(screen.getByLabelText('关键节点')).toBeInTheDocument();
    expect(screen.getByText('承接人员（可多选）')).toBeInTheDocument();
  });

  it('adds and collapses multiple action cards', () => {
    render(<ActionBreakdownForm open cycle="2026-09" person={people[0]} parents={parents} actions={[]} people={people} busy={false} onClose={vi.fn()} onSave={vi.fn(async () => undefined)} />);

    fireEvent.click(screen.getByRole('button', {name: '拆解动作'}));
    fireEvent.click(screen.getByRole('button', {name: '继续添加'}));
    expect(screen.getByText('关键动作 2')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', {name: '收起'})[0]);
    expect(screen.getByRole('button', {name: '展开'})).toBeInTheDocument();
  }, 15000);
});
