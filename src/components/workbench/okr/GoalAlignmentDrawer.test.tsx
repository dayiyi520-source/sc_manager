// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from 'antd';
import { GoalAlignmentDrawer } from './GoalAlignmentDrawer';
import type { OkrRecord } from '../../../services/okrRepository';
const source:OkrRecord={id:'source',kind:'objective',ownerId:'boss',periodKey:'2026-10',version:1,status:'active',payload:{title:'公司指标',keyResults:[{id:'kr',title:'业务结果',weight:100,progress:0}]}};
describe('添加对齐抽屉',()=>{
 it('keeps the fullscreen parent stationary when alignment opens and closes',async()=>{
  const view=render(<Drawer open placement="bottom" size="100dvh" push={false} rootClassName="test-goal-editor"><GoalAlignmentDrawer open records={[source]} cycle="2026-10" value="" onCancel={vi.fn()} onConfirm={vi.fn()}/></Drawer>);
  await screen.findByRole('dialog',{name:'添加对齐'});
  await waitFor(()=>expect(document.querySelector('.test-goal-editor > .ant-drawer-content-wrapper')?.getAttribute('style')).not.toContain('translate'));
  view.rerender(<Drawer open placement="bottom" size="100dvh" push={false} rootClassName="test-goal-editor"><GoalAlignmentDrawer open={false} records={[source]} cycle="2026-10" value="" onCancel={vi.fn()} onConfirm={vi.fn()}/></Drawer>);
  await waitFor(()=>expect(document.querySelector('.test-goal-editor > .ant-drawer-content-wrapper')?.getAttribute('style')).not.toContain('translate'));
 });
 it('shows O/KR choices and confirms a single source while cancellation retains the previous choice',()=>{
  const confirm=vi.fn(),cancel=vi.fn();
  render(<GoalAlignmentDrawer open records={[source]} cycle="2026-10" value="source:" onCancel={cancel} onConfirm={confirm}/>);
  expect(screen.getByRole('dialog',{name:'添加对齐'})).toBeInTheDocument();
  fireEvent.click(screen.getByText('KR · 业务结果'));
  fireEvent.click(screen.getByRole('button',{name:/取.*消/}));
  expect(cancel).toHaveBeenCalledOnce();expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:/确.*定/}));expect(confirm).toHaveBeenCalledWith('source:kr');
 });
 it('handles absent and removed sources without confirming an invalid selection',async()=>{
  render(<GoalAlignmentDrawer open records={[]} cycle="2026-10" value="source:kr" onCancel={vi.fn()} onConfirm={vi.fn()}/>);
  expect(await screen.findByText('当前周期暂无可对齐的直属上级生效目标')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/确.*定/})).toBeDisabled();
 });
});
