// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalChangePanel } from './GoalChangePanel';
import { okrRepository, type OkrRecord } from '../../../services/okrRepository';
const pending: OkrRecord = { id:'goal',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:2,payload:{goalModelVersion:2,goalLevel:'department',title:'原指标'},changeRequest:{id:'c',status:'pending',reason:'指标调整',reviewerId:'boss',baseVersion:1,requestedAt:'2026-10-12',payload:{title:'新指标'}} };
afterEach(() => vi.restoreAllMocks());
describe('目标修改审核与同步反馈', () => {
 it('only shows a review to the designated reviewer and retains failure details', async () => {
  const update = vi.spyOn(okrRepository,'update').mockRejectedValue(new Error('版本冲突，请刷新'));
  const refresh=vi.fn();
  render(<GoalChangePanel records={[pending]} people={[]} viewerId="boss" onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button',{name:'查看修改'}));
  const dialog = (await screen.findByText('审核目标修改',{selector:'.ant-modal-title'})).closest('[role=dialog]') as HTMLElement;
  expect(within(dialog).getByText('原指标')).toBeInTheDocument(); expect(within(dialog).getByText('新指标')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button',{name:'退回修改'}));
  expect(within(dialog).getByText('请填写退回原因')).toBeInTheDocument(); expect(update).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'批准生效'}));
  expect(await within(dialog).findByText('版本冲突，请刷新')).toBeInTheDocument(); expect(refresh).not.toHaveBeenCalled();
 });
 it('unrelated users see neither others pending changes nor sources', () => {
  const {container}=render(<GoalChangePanel records={[pending]} people={[]} viewerId="another" onRefresh={vi.fn()}/>);
  expect(container).toBeEmptyDOMElement();
 });
 it('requires explicit confirmation before syncing an updated source', async () => {
  const source={...pending,id:'company',ownerId:'boss',version:3,changeRequest:undefined,payload:{title:'公司O',keyResults:[{id:'source-kr',title:'新公司KR',weight:100,progress:0}]}};
  const own={...pending,changeRequest:undefined,payload:{...pending.payload,sourceObjectiveId:'company',sourceKrId:'source-kr',sourceVersion:1,sourceTitle:'旧公司KR'}};
  const update=vi.spyOn(okrRepository,'update').mockResolvedValue(undefined),refresh=vi.fn().mockResolvedValue(undefined);
  render(<GoalChangePanel records={[source,own]} people={[]} viewerId="manager" onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button',{name:'查看来源变更'}));
  const dialog=(await screen.findByText('确认上级目标同步',{selector:'.ant-modal-title'})).closest('[role=dialog]') as HTMLElement;
  expect(within(dialog).getByText('此前关联：旧公司KR')).toBeInTheDocument(); expect(update).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'确认已核对'}));
  await waitFor(()=>expect(update).toHaveBeenCalledWith(own,'acknowledge-source',{feedback:''},'manager'));
 });
});
