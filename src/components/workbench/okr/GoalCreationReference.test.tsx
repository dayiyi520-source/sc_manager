// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GoalCreationReference } from './GoalCreationReference';
import type { OkrPerson, OkrRecord, OkrSettings } from '../../../services/okrRepository';

afterEach(cleanup);
const people: OkrPerson[] = [
  { id: 'boss', name: '老板', department: '公司', rootFlag: 1, supervisorId: null, version: 1 },
  { id: 'manager', name: '主管', department: '研发', goalRole: 'supervisor', rootFlag: 0, supervisorId: 'boss', version: 1 },
  { id: 'staff', name: '员工', department: '研发', rootFlag: 0, supervisorId: 'manager', version: 1 },
  { id: 'other', name: '其他主管', department: '销售', goalRole: 'supervisor', rootFlag: 0, supervisorId: 'boss', version: 1 },
];
const settings = { cycles: { crossAlignment: false } } as OkrSettings;
const company: OkrRecord = { id: 'c1', kind: 'objective', ownerId: 'boss', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '公司产品目标', goalLevel: 'company', keyResults: [{ id: 'ck1', title: '产品规划', weight: 50, progress: 0, assigneeIds: ['manager'] }, { id: 'ck2', title: '市场推广', weight: 50, progress: 0, assigneeIds: ['other'] }] } };
const company2: OkrRecord = { ...company, id: 'c2', payload: { title: '公司交付目标', goalLevel: 'company', keyResults: [{ id: 'ck3', title: '风险闭环', weight: 100, progress: 0, assigneeIds: ['manager'] }] } };
const dept: OkrRecord = { ...company, id: 'd1', ownerId: 'manager', payload: { title: '部门产品目标', goalLevel: 'department', sourceObjectiveId: 'c1', sourceKrId: 'ck1', keyResults: [{ id: 'dk1', title: '核心模块设计', weight: 50, progress: 0, assigneeIds: ['staff'] }, { id: 'dk2', title: '团队评审', weight: 50, progress: 0, assigneeIds: ['manager'] }] } };
const dept2: OkrRecord = { ...dept, id: 'd2', payload: { title: '部门风险目标', goalLevel: 'department', sourceObjectiveId: 'c2', sourceKrId: 'ck3', keyResults: [{ id: 'dk3', title: '重点风险处理', weight: 100, progress: 0, assigneeIds: ['staff'] }] } };
const records = [company, company2, dept, dept2];

it('shows every assigned branch for a supervisor and switches to all company goals without department goals', () => {
  const onLocate = vi.fn();
  render(<GoalCreationReference records={[company,company2]} people={people} person={people[1]} level="department" cycle="2026-10" settings={settings} entries={[{id:'form1',payload:{title:'',sourceObjectiveId:'c1',sourceKrId:'ck1'}},{id:'form2',payload:{title:'',sourceObjectiveId:'c2',sourceKrId:'ck3'}}]} onLocate={onLocate}/>);
  expect(screen.getByText('公司产品目标')).toBeVisible();
  expect(screen.getByText('公司交付目标')).toBeVisible();
  expect(screen.getAllByText('本部门承接')).toHaveLength(2);
  expect(screen.queryByText('本人承接')).not.toBeInTheDocument();
  expect(screen.queryByText('市场推广')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: '定位填写' })[1]);
  expect(onLocate).toHaveBeenCalledWith('form2');
  fireEvent.click(screen.getByText('全部目标'));
  expect(screen.getByText('市场推广')).toBeVisible();
  expect(screen.queryByText('部门产品目标')).not.toBeInTheDocument();
});

it('keeps two employee chains and shared ancestors once, then adds company and own-department reference branches', () => {
  const otherDept = { ...dept, id: 'other-dept', ownerId: 'other', payload: { ...dept.payload, title: '销售部门目标' } };
  const extraDept = { ...dept, id: 'd3', payload: { ...dept.payload, title: '部门其他目标', keyResults: [{ id: 'dk4', title: '其他成员的工作', weight: 100, progress: 0, assigneeIds: ['manager'] }] } };
  render(<GoalCreationReference records={[...records, extraDept, otherDept]} people={people} person={people[2]} level="personal" cycle="2026-10" settings={settings} entries={[]} onLocate={vi.fn()}/>);
  for (const title of ['公司产品目标', '公司交付目标', '部门产品目标', '部门风险目标', '核心模块设计', '重点风险处理']) expect(screen.getAllByText(title)).toHaveLength(1);
  expect(screen.queryByText('团队评审')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('全部目标'));
  for (const title of ['市场推广', '团队评审', '部门其他目标']) expect(screen.getByText(title)).toBeVisible();
  expect(screen.queryByText('销售部门目标')).not.toBeInTheDocument();
  expect(screen.getByText('部门产品目标').closest('.goal-source-branch')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '收起' }));
  expect(screen.getByText('部门产品目标')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '展开' }));
  fireEvent.click(screen.getByText('我的承接'));
  expect(screen.getByText('重点风险处理')).toBeVisible();
});

it('does not expose drafts, unapproved initial submissions, deleted goals or other periods', () => {
  const hidden: OkrRecord[] = [
    { ...company, id: 'draft', status: 'draft', payload: { ...company.payload, title: '未提交内容' } },
    { ...company, id: 'deleted', status: 'deleted', payload: { ...company.payload, title: '删除内容' } },
    { ...company, id: 'pending', status: 'submitted', payload: { ...company.payload, title: '待确认内容' }, changeRequest: { purpose: 'initial', status: 'pending' } as OkrRecord['changeRequest'] },
    { ...company, id: 'nov', periodKey: '2026-11', payload: { ...company.payload, title: '其他周期内容' } },
  ];
  render(<GoalCreationReference records={hidden} people={people} person={people[1]} level="department" cycle="2026-10" settings={settings} entries={[]} onLocate={vi.fn()}/>);
  expect(screen.getByText('暂无本人承接目标')).toBeVisible();
  fireEvent.click(screen.getByText('全部目标'));
  expect(screen.getByText('暂无上级目标')).toBeVisible();
  for (const record of hidden) expect(screen.queryByText(record.payload.title)).not.toBeInTheDocument();
});

it('marks an existing draft and initial confirmation while keeping its source visible', () => {
  const draft: OkrRecord = { ...dept, id: 'mine', ownerId: 'staff', status: 'draft', payload: { title: '已存个人目标', goalLevel: 'personal', sourceObjectiveId: 'd1', sourceKrId: 'dk1' } };
  const pending: OkrRecord = { ...draft, id: 'pending-personal', status: 'submitted', payload: { ...draft.payload, sourceObjectiveId: 'd2', sourceKrId: 'dk3' } };
  render(<GoalCreationReference records={[...records, draft, pending]} people={people} person={people[2]} level="personal" cycle="2026-10" settings={settings} entries={[]} onLocate={vi.fn()}/>);
  expect(within(screen.getByRole('region', { name: '目标承接链路' })).getByText('已生成草稿')).toBeVisible();
  expect(screen.getByText('已提交目标')).toBeVisible();
  expect(screen.getByText('已提交目标')).toHaveClass('is-submitted');
  expect(screen.getByText('已生成草稿')).toHaveClass('is-draft');
});

it('uses one locate action for multiple forms on the same KR and removes repeated helper copy', () => {
  const onLocate = vi.fn();
  render(<GoalCreationReference records={[company,company2]} people={people} person={people[1]} level="department" cycle="2026-10" settings={settings} entries={['one','two','three'].map(id => ({id,payload:{title:'',sourceObjectiveId:'c1',sourceKrId:'ck1'}}))} onLocate={onLocate}/>);
  expect(screen.getAllByRole('button', {name:'定位填写'})).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', {name:'定位填写'}));
  expect(onLocate).toHaveBeenCalledWith('one');
  expect(screen.queryByText('上级目标参考')).not.toBeInTheDocument();
  expect(screen.queryByText(/只读参考/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('全部目标'));
  expect(screen.queryByText(/只读参考/)).not.toBeInTheDocument();
});


it('shows a manager personal assignment from department goals and only its company ancestor', () => {
  render(<GoalCreationReference records={records} people={people} person={people[1]} level="personal" cycle="2026-10" settings={settings} entries={[]} onLocate={vi.fn()}/>);
  for (const title of ['部门产品目标', '团队评审', '公司产品目标', '产品规划']) expect(screen.getByText(title)).toBeVisible();
  for (const title of ['公司交付目标', '风险闭环', '核心模块设计', '重点风险处理']) expect(screen.queryByText(title)).not.toBeInTheDocument();
  expect(screen.getAllByText('本人承接')).toHaveLength(1);
  expect(screen.getByText('本人承接').closest('.goal-source-kr')).toHaveTextContent('团队评审');
  expect(screen.queryByText('本部门承接')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('全部目标'));
  expect(screen.getByText('公司交付目标')).toBeVisible();
  expect(screen.getByText('核心模块设计')).toBeVisible();
  expect(screen.getAllByText('本人承接')).toHaveLength(1);
});

it('does not treat company assignments as personal assignments when a manager has no department KR', () => {
  const unassigned = {...dept,payload:{...dept.payload,keyResults:dept.payload.keyResults!.map(kr=>({...kr,assigneeIds:['staff']}))}};
  render(<GoalCreationReference records={[company,company2,unassigned]} people={people} person={people[1]} level="personal" cycle="2026-10" settings={settings} entries={[]} onLocate={vi.fn()}/>);
  expect(screen.getByText('暂无本人承接目标')).toBeVisible();
  expect(screen.queryByText('公司产品目标')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('全部目标'));
  expect(screen.getByText('公司产品目标')).toBeVisible();
  expect(screen.getByText('部门产品目标')).toBeVisible();
  expect(screen.queryByText('本人承接')).not.toBeInTheDocument();
});


it.each(['draft', 'active'] as const)('does not locate a new challenge under an existing %s source', status => {
  const saved: OkrRecord = {...dept,id:'saved',ownerId:'staff',status,payload:{title:'Saved',goalLevel:'personal',sourceObjectiveId:'d1',sourceKrId:'dk1'}};
  render(<GoalCreationReference records={[...records,saved]} people={people} person={people[2]} level="personal" cycle="2026-10" settings={settings} entries={[{id:'challenge',payload:{title:'',sourceObjectiveId:'d1',sourceKrId:'dk1'}}]} onLocate={vi.fn()}/>);
  expect(screen.queryByRole('button',{name:'定位填写'})).not.toBeInTheDocument();
});

it('never locates an entry while editing', () => {
  render(<GoalCreationReference editing records={records} people={people} person={people[2]} level="personal" cycle="2026-10" settings={settings} entries={[{id:'editing',payload:{title:'',sourceObjectiveId:'d1',sourceKrId:'dk1'}}]} onLocate={vi.fn()}/>);
  expect(screen.queryByRole('button',{name:'定位填写'})).not.toBeInTheDocument();
});
