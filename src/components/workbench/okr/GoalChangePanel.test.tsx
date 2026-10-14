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
  render(<GoalChangePanel work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} records={[pending]} people={[]} viewerId="boss" onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button',{name:'查看修改'}));
  const dialog = (await screen.findByText('审核目标修改',{selector:'.ant-modal-title'})).closest('[role=dialog]') as HTMLElement;
  expect(within(dialog).getByLabelText('修改信息')).toHaveTextContent('原指标');expect(within(dialog).getByLabelText('修改信息')).toHaveTextContent('新指标');
  expect(within(dialog).getByText('指标调整')).toBeInTheDocument();
  expect(within(dialog).getByRole('button',{name:'查看目标详情'})).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button',{name:'退回修改'}));
  expect(within(dialog).getByText('请填写退回原因')).toBeInTheDocument(); expect(update).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'批准生效'}));
  expect(await within(dialog).findByText('版本冲突，请刷新')).toBeInTheDocument(); expect(refresh).not.toHaveBeenCalled();
 });
 it('opens original detail for first review and hides the applicant notice', async () => {
  vi.spyOn(okrRepository,'events').mockResolvedValue([]);
  const initial: OkrRecord = {...pending,status:'submitted',changeRequest:{...pending.changeRequest!,purpose:'initial',payload:{...pending.payload,title:'首次目标',deadline:'2026-10-31',keyResults:[{id:'kr',title:'完成发布',weight:100,progress:0,deadline:'2026-10-31',executionActions:[{id:'a',ownerId:'manager',title:'完成设计',weight:100,progress:20,deadline:'2026-10-20'}]}]}}};
  const {unmount}=render(<GoalChangePanel work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} records={[initial]} people={[]} viewerId="manager" onRefresh={vi.fn()}/>);
  expect(screen.queryByText(/申请待审核/)).not.toBeInTheDocument();
  unmount();
  render(<GoalChangePanel work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} records={[initial]} people={[]} viewerId="boss" onRefresh={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'查看目标'}));
  expect(await screen.findByText('首次目标',{selector:'h2'})).toBeInTheDocument();
  expect(screen.queryByText('修改已审核生效')).not.toBeInTheDocument();
  expect(screen.queryByText(/原计划截止/)).not.toBeInTheDocument();
  expect(screen.queryByText('修改原因')).not.toBeInTheDocument();
  expect(screen.getByLabelText('A1进度：20%')).toBeInTheDocument();
  expect(screen.getByLabelText('A1权重：100%')).toBeInTheDocument();
  expect(screen.getByLabelText('A1截止日期：2026-10-20')).toBeInTheDocument();
 });
 it('unrelated users see neither others pending changes nor sources', () => {
  const {container}=render(<GoalChangePanel work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} records={[pending]} people={[]} viewerId="another" onRefresh={vi.fn()}/>);
  expect(container).toBeEmptyDOMElement();
 });
 it('compares a saved source snapshot without treating the employee action as a source change', async () => {
  const originalKr={id:'source-kr',title:'交付结果',weight:100,progress:0,details:[{id:'d',name:'产品甲',version:'V1',stage:'设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-20'}]};
  const source={...pending,id:'company',ownerId:'boss',version:3,changeRequest:undefined,payload:{title:'公司O',keyResults:[{...originalKr,details:[{...originalKr.details[0],version:'V2',stage:'开发',plannedEndDate:'2026-10-25'}]}]}};
  const own={...pending,changeRequest:undefined,payload:{...pending.payload,sourceObjectiveId:'company',sourceKrId:'source-kr',sourceVersion:1,sourceTitle:'交付结果',sourceKrData:originalKr}};
  render(<GoalChangePanel work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} records={[source,own]} people={[]} viewerId="manager" onRefresh={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'查看来源变更'}));
  const summary=await screen.findByLabelText('上级来源变化');
  expect(summary).toHaveTextContent('V1');expect(summary).toHaveTextContent('V2');expect(summary).toHaveTextContent('设计');expect(summary).toHaveTextContent('开发');expect(summary).toHaveTextContent('2026-10-25');
  expect(summary).not.toHaveTextContent('本人动作');
 });
 it('requires explicit confirmation before syncing an updated source', async () => {
  const source={...pending,id:'company',ownerId:'boss',version:3,changeRequest:undefined,payload:{title:'公司O',keyResults:[{id:'source-kr',title:'新公司KR',weight:100,progress:0}]}};
  const own={...pending,changeRequest:undefined,payload:{...pending.payload,sourceObjectiveId:'company',sourceKrId:'source-kr',sourceVersion:1,sourceTitle:'旧公司KR'}};
  const update=vi.spyOn(okrRepository,'update').mockResolvedValue(undefined),refresh=vi.fn().mockResolvedValue(undefined);
  render(<GoalChangePanel work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} records={[source,own]} people={[]} viewerId="manager" onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button',{name:'查看来源变更'}));
  const dialog=(await screen.findByText('确认上级目标同步',{selector:'.ant-modal-title'})).closest('[role=dialog]') as HTMLElement;
  expect(within(dialog).getByLabelText('上级来源变化')).toHaveTextContent('旧公司KR');expect(within(dialog).getByLabelText('上级来源变化')).toHaveTextContent('新公司KR'); expect(update).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button',{name:'确认已核对'}));
  await waitFor(()=>expect(update).toHaveBeenCalledWith(own,'acknowledge-source',{feedback:''},'manager'));
 });
});
