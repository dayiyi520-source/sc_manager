// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalAlignmentDrawer } from './GoalAlignmentDrawer';
import type { OkrRecord } from '../../../services/okrRepository';
const source:OkrRecord={id:'source',kind:'objective',ownerId:'boss',periodKey:'2026-10',version:1,status:'active',payload:{title:'公司指标',keyResults:[{id:'kr',title:'业务结果',weight:100,progress:0}]}};
describe('添加对齐抽屉',()=>{
 it('shows O/KR choices and confirms a single source while cancellation retains the previous choice',()=>{
  const confirm=vi.fn(),cancel=vi.fn();
  render(<GoalAlignmentDrawer open records={[source]} cycle="2026-10" value="source:" onCancel={cancel} onConfirm={confirm}/>);
  expect(screen.getByRole('dialog',{name:'添加对齐'})).toBeInTheDocument();
  fireEvent.click(screen.getByText('KR · 业务结果'));
  fireEvent.click(screen.getByRole('button',{name:/取.*消/}));
  expect(cancel).toHaveBeenCalledOnce();expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:/确.*定/}));expect(confirm).toHaveBeenCalledWith('source:kr');
 });
 it('handles absent and removed sources without confirming an invalid selection',()=>{
  render(<GoalAlignmentDrawer open records={[]} cycle="2026-10" value="source:kr" onCancel={vi.fn()} onConfirm={vi.fn()}/>);
  expect(screen.getByText('当前周期暂无可对齐的上级生效目标')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/确.*定/})).toBeDisabled();
 });
});
