// @vitest-environment jsdom
import React from 'react';
import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { GoalAssignmentLinks } from './GoalAssignmentLinks';
import { okrRepository,type OkrPerson,type OkrRecord } from '../../../services/okrRepository';
const person:OkrPerson={id:'manager',name:'主管',jobTitle:'产品主管',department:'研发',supervisorId:'boss',rootFlag:0,version:0};
const source:OkrRecord={id:'company',kind:'objective',ownerId:'boss',periodKey:'2026-09',status:'active',version:2,payload:{title:'公司方向',keyResults:[{id:'kr',title:'新指派',weight:100,progress:0,assigneeIds:['manager']}]}};
const own:OkrRecord={id:'own',kind:'objective',ownerId:'manager',periodKey:'2026-09',status:'active',version:1,payload:{goalModelVersion:2,goalLevel:'department',origin:'autonomous',title:'已有自主目标',keyResults:[{id:'own-kr',title:'部门结果',weight:100,progress:0,executionActions:[{id:'a',ownerId:'manager',title:'已填写动作',progress:0,deadline:'2026-09-25'}]}]}};
afterEach(()=>vi.restoreAllMocks());
describe('后补关联已有目标',()=>{
 it('retains actions and submits a link for reviewer confirmation, keeping errors retryable',async()=>{
  const update=vi.spyOn(okrRepository,'update').mockRejectedValueOnce(new Error('网络断开')).mockResolvedValueOnce(undefined);const refresh=vi.fn().mockResolvedValue(undefined);
  render(<GoalAssignmentLinks records={[source,own]} person={person} onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button',{name:'关联已有目标'}));
  fireEvent.mouseDown(screen.getByRole('combobox',{name:'已有自主目标'}));
  fireEvent.click(await screen.findByText('已有自主目标'));
  fireEvent.click(screen.getByRole('button',{name:'提交关联确认'}));
  expect(await screen.findByText('网络断开')).toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();
  await waitFor(()=>expect(screen.getByRole('button',{name:/提交关联确认/})).not.toHaveClass('ant-btn-loading'));
  fireEvent.click(screen.getByRole('button',{name:/提交关联确认/}));await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
  expect(update.mock.calls[1][2]).toMatchObject({payload:{sourceObjectiveId:'company',sourceKrId:'kr',sourceVersion:2,keyResults:own.payload.keyResults}});
 });
 it('does not offer to re-associate an already accepted KR',()=>{
  render(<GoalAssignmentLinks records={[source,{...own,payload:{...own.payload,sourceKrId:'kr'}}]} person={person} onRefresh={vi.fn()}/>);
  expect(screen.queryByRole('button',{name:'关联已有目标'})).not.toBeInTheDocument();
 });
});
