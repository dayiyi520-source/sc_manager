// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { Modal } from 'antd';
import { okrRepository } from '../../services/okrRepository';
import type { OkrRecord, OkrSettings } from '../../services/okrRepository';
import type { OKRItem, PerformanceReview } from '../../types';

class ReviewIntersectionObserver { observe() {} unobserve() {} disconnect() {} }
globalThis.IntersectionObserver = ReviewIntersectionObserver as unknown as typeof IntersectionObserver;

const objectiveRecord: OkrRecord = {
  id: 'objective-1',
  kind: 'objective',
  ownerId: 'boss',
  periodKey: '2026-09',
  status: 'active',
  version: 1,
  createdAt: '2026-09-01T08:00:00',
  payload: {
    title: '提升年度经营质量',
    progress: 30,
    keyResults: [{ id: 'a1', title: '改善重点客户交付', weight: 100, progress: 30, assigneeIds: ['manager'] }],
  },
};

const actionParent: OkrRecord = {
  id: 'parent-action',
  kind: 'action',
  ownerId: 'manager',
  periodKey: '2026-09',
  status: 'active',
  version: 1,
  payload: { title: '改善重点客户交付', parentObjectiveId: 'objective-1', parentActionId: 'a1' },
};

const okr: OKRItem = {
  id: 'objective-1',
  cycle: '2026-09',
  ownerId: 'boss',
  ownerName: '老板',
  department: '管理层',
  category: 'my',
  objective: '提升年度经营质量',
  weight: 100,
  progress: 30,
  deadline: '2026-09-30',
  status: 'active',
  keyResults: [{ id: 'a1', content: '改善重点客户交付', weight: 100, progress: 30, deadline: '2026-09-30' }],
};

const draftRecords: OkrRecord[] = [
  {
    id: 'draft-objective-1', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'draft', version: 1,
    payload: { title: '草稿目标一', keyResults: [{ id: 'draft-a1', title: '草稿行动一', weight: 100, progress: 0 }] },
  },
  {
    id: 'draft-objective-2', kind: 'objective', ownerId: 'boss', periodKey: '2026-09', status: 'draft', version: 1,
    payload: { title: '草稿目标二', keyResults: [{ id: 'draft-a2', title: '草稿行动二', weight: 100, progress: 0 }] },
  },
];

const draftOkrs: OKRItem[] = draftRecords.map((record, index) => ({
  id: record.id,
  cycle: record.periodKey,
  ownerId: record.ownerId,
  ownerName: '老板',
  department: '管理层',
  category: 'my',
  objective: record.payload.title,
  weight: 100,
  progress: 0,
  deadline: '',
  status: 'draft',
  keyResults: [{ id: `draft-a${index + 1}`, content: `草稿行动${index + 1}`, weight: 100, progress: 0, deadline: '' }],
}));

const defaultPeople = [
  { id: 'boss', name: '林志豪', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '主管', jobTitle: '产品主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
];

const okrState = {
  records: [objectiveRecord],
  okrs: [okr],
  reviewableOkrs: [okr],
  performances: [] as (PerformanceReview & { authorId: string })[],
  people: defaultPeople,
  work: [],
  actionParents: [actionParent],
  productLineOptions: ['真实产品'],
  projectOptions: ['真实交付项目'],
  businessOptionsLoading: false,
  businessOptionsError: undefined,
  loading: false,
  error: undefined as unknown,
  workLoading: false,
  workError: undefined,
  busy: false,
  refresh: vi.fn(),
  refreshWork: vi.fn(),
  saveActions: vi.fn(async () => true),
  saveObjective: vi.fn(async () => true),
  saveObjectiveDraft: vi.fn(async () => true),
  saveReview: vi.fn(async () => true),
  saveReviewDraft: vi.fn(async () => true),
  submitReviewDraft: vi.fn(async () => true),
  submitOkrDraft: vi.fn(async () => true),
  updateOkr: vi.fn(async () => true),
  deleteOkr: vi.fn(async () => true),
  settings: { defaultView: 'list', timeRules: [], validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: false, resultRequired: true }, dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, templates: [] } as OkrSettings,
  saveSettings: vi.fn(async () => true),
};

vi.mock('./okr/useOriginalOkr', () => ({ useOriginalOkr: () => okrState }));
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: ReactNode }) => children }));
let currentUser = { id: 'boss', name: '老板', department: '管理层' };
const reviewToast = vi.hoisted(() => vi.fn());

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ currentUser, addToast: reviewToast }),
  useAppNavigationContext: () => ({ openPageTab: vi.fn() }),
}));

import { appendDemoBreakdown, filterVisibleDemoBreakdowns, includeSelectedCycle, OKRPerformanceView, ReviewSummaryView } from './OKRPerformanceView';

async function openTargetDetails(target: HTMLElement) {
  fireEvent.click(within(target).getByRole('button', {name: /^更多操作：/}));
  fireEvent.click(await screen.findByRole('menuitem', {name: '查看详情'}));
}

describe('OKRPerformanceView target navigation', () => {
  it('opens root personal creation as personal instead of company and saves a personal draft', async () => {
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'添加我的目标'}));
    const title=await screen.findByLabelText('计划动作内容');
    fireEvent.change(title,{target:{value:'本人执行目标'}});
    expect(screen.getByText('个人级')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'存草稿'}));
    await waitFor(()=>expect(okrState.saveObjectiveDraft).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({title:'本人执行目标',goalLevel:'personal',goalModelVersion:2})));
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T12:00:00+08:00'));
    vi.clearAllMocks();
    sessionStorage.clear();
    okrState.records = [objectiveRecord];
    okrState.okrs = [okr];
    okrState.reviewableOkrs = [okr];
    okrState.performances = [];
    okrState.people = defaultPeople;
    okrState.loading = false;
    okrState.error = undefined;
    okrState.actionParents = [actionParent];
    okrState.settings.defaultView = 'list';
    okrState.settings.objectiveTitleTemplates = undefined;
    currentUser = { id: 'boss', name: '老板', department: '管理层' };
  });

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each(['list', 'card'])('opens the manager breakdown itself from %s instead of the upstream company goal', async view => {
    currentUser = {id:'manager',name:'主管',department:'产品部'};
    okrState.records = [objectiveRecord, actionParent, {...actionParent,id:'draft-breakdown',status:'draft'}];
    okrState.settings.defaultView = view as 'list' | 'card';
    render(<OKRPerformanceView/>);
    const label = view === 'list' ? '目标：改善重点客户交付' : '目标卡片：改善重点客户交付';
    await openTargetDetails(screen.getByLabelText(label));
    expect(await screen.findByText('目标详情')).toBeInTheDocument();
    expect(screen.getByLabelText('制定人：主管')).toBeInTheDocument();
    expect(screen.getByText('部门级')).toBeInTheDocument();
    expect(screen.queryByText('公司级')).not.toBeInTheDocument();
    expect(document.querySelector('.company-objective-detail-drawer.ant-drawer-bottom')).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'修改目标'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button', {name:'关闭目标详情'}));
    expect(await screen.findByLabelText(label)).toBeInTheDocument();
    okrState.settings.defaultView = 'list';
  });

  it.each(['产品主管', '产品经理'])('edits a %s legacy goal in the creation drawer and closes directly to the list', async jobTitle => {
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    okrState.people = defaultPeople.map(person => person.id === 'manager' ? { ...person, jobTitle } : person);
    okrState.records = [objectiveRecord, { ...actionParent, payload: { ...actionParent.payload, title: '已有动作', weight: 100, deadline: '2026-09-30', assigneeIds: ['manager'] } }];
    okrState.actionParents = [okrState.records[1]];
    render(<OKRPerformanceView />);
    await openTargetDetails(screen.getByLabelText(/^目标：/));
    fireEvent.click(await screen.findByRole('button', { name: '修改目标' }));
    expect(document.querySelector('.company-objective-drawer.ant-drawer-bottom')).toBeInTheDocument();
    expect(document.querySelector('.company-objective-drawer .goal-editor-heading')).toContainElement(screen.getByRole('combobox', { name: '目标归属周期' }));
    expect(document.querySelector('.company-objective-drawer > .ant-drawer-content-wrapper')).toHaveStyle({ height: '100dvh' });
    expect(screen.getByText(jobTitle === '产品主管' ? '部门级' : '个人级')).toBeInTheDocument();
    expect(document.querySelector('.okr-source-heading')).not.toBeVisible();
    expect(screen.getByText('来源：O1 · 提升年度经营质量 / KR1 · 改善重点客户交付')).toBeVisible();
    expect(screen.getByLabelText('A1 名称')).toHaveValue('已有动作');
    expect(screen.getByLabelText('KR1 截止日期')).toHaveValue('2026-09-30');
    fireEvent.click(screen.getByRole('button', { name: /Close|close|关闭/ }));
    expect(await screen.findByLabelText(/^目标：/)).toBeInTheDocument();
    expect(screen.queryByText('目标详情')).not.toBeInTheDocument();
    expect(okrState.updateOkr).not.toHaveBeenCalled();
  }, 15000);

  it('edits a legacy objective without inventing a link to current assignments', async () => {
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    const legacy: OkrRecord = { ...objectiveRecord, id: 'legacy-own', ownerId: 'manager', payload: { title: '完成核心产品体验优化', weight: 100, keyResults: [{ id: 'legacy-kr', title: '已有个人动作', weight: 100, progress: 0, deadline: '2026-09-30' }] } };
    okrState.records = [objectiveRecord, legacy];
    okrState.okrs = [{ ...okr, id: legacy.id, ownerId: 'manager', ownerName: '主管', objective: legacy.payload.title }];
    render(<OKRPerformanceView />);
    await openTargetDetails(screen.getByLabelText(/^目标：/));
    fireEvent.click(await screen.findByRole('button', { name: '修改目标' }));
    expect(screen.getByText('来源：未关联上级目标')).toBeVisible();
    expect(document.querySelector('.okr-source-heading')).not.toBeVisible();
    expect(screen.getByLabelText('目标名称')).toHaveValue('完成核心产品体验优化');
    expect(screen.getByLabelText('A1 名称')).toHaveValue('已有个人动作');
    expect(okrState.updateOkr).not.toHaveBeenCalled();
  });

  it.each(['manager','employee'])('confirms weights for multiple saved %s primary targets before submission', async ownerId => {
    currentUser={id:ownerId,name:'本人',department:'产品部'};
    if(ownerId==='employee') okrState.people=[...defaultPeople,{id:'employee',name:'本人',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
    okrState.records=draftRecords.map(record=>({...record,ownerId,payload:{...record.payload,goalModelVersion:2,goalLevel:ownerId==='manager'?'department':'personal',weight:100}}));
    okrState.okrs=draftOkrs.map(item=>({...item,ownerId}));
    render(<OKRPerformanceView/>);
    if (ownerId === 'manager') fireEvent.click(screen.getByRole('button', { name: '部门目标' }));
    fireEvent.click(screen.getByRole('button',{name:'提 交'}));
    const dialog=(await screen.findByText(ownerId==='manager'?'确认目标权重':'确认主 KR 权重')).closest('[role="dialog"]') as HTMLElement;
    expect(okrState.submitOkrDraft).not.toHaveBeenCalled();expect(okrState.updateOkr).not.toHaveBeenCalled();
    const label=ownerId==='manager'?'O':'KR';
    expect(within(dialog).getByLabelText(label+'2权重')).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(label+'1权重'),{target:{value:'70'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'确认并提交'}));
    await waitFor(()=>expect(okrState.updateOkr).toHaveBeenCalledTimes(2));
    expect(okrState.updateOkr).toHaveBeenNthCalledWith(1,'draft-objective-1',expect.objectContaining({weight:70}),true);
    expect(okrState.updateOkr).toHaveBeenNthCalledWith(2,'draft-objective-2',expect.objectContaining({weight:30}),true);
  });

  it('confirms before deleting a manager legacy goal', async () => {
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    okrState.records = [objectiveRecord, actionParent];
    render(<OKRPerformanceView />);
    await openTargetDetails(screen.getByLabelText('目标：改善重点客户交付'));
    fireEvent.click(await screen.findByRole('button', { name: '删除目标' }));
    const dialog = (await screen.findByText('确认删除此目标吗？')).closest('[role="dialog"]') as HTMLElement;
    expect(within(dialog).getByText('删除后本条目标内容将全部丢失。')).toBeInTheDocument();
    expect(okrState.deleteOkr).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: /^确\s*定$/ }));
    await waitFor(() => expect(okrState.deleteOkr).toHaveBeenCalledWith('parent-action'));
  }, 15000);

  it.each(['list', 'card'] as const)('deletes a draft directly from %s without mounting detail or editor', async view => {
    okrState.settings.defaultView = view;
    okrState.records = [{ ...objectiveRecord, status: 'draft' }];
    render(<OKRPerformanceView />);
    fireEvent.click(screen.getByLabelText('更多操作：提升年度经营质量'));
    fireEvent.click(await screen.findByRole('menuitem', {name:'删除'}));
    expect(await screen.findByText('删除后本条目标内容将全部丢失。')).toBeInTheDocument();
    expect(screen.queryByText('目标详情')).not.toBeInTheDocument();
    expect(document.querySelector('.company-objective-drawer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:/Cancel|取\s*消/}));
    fireEvent.click(screen.getByLabelText('编辑目标：提升年度经营质量'));
    expect(document.querySelector('.company-objective-drawer')).toBeInTheDocument();
    expect(screen.queryByText('删除后本条目标内容将全部丢失。')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:/Close|close|关闭/}));
    fireEvent.click(screen.getByLabelText('更多操作：提升年度经营质量'));
    fireEvent.click(await screen.findByRole('menuitem', {name:'删除'}));
    fireEvent.click(screen.getByRole('button', {name:/^确\s*定$/}));
    await waitFor(() => expect(okrState.deleteOkr).toHaveBeenCalledWith('objective-1'));
  }, 15000);

  it('submits only the edited personal draft when another draft exists',async()=>{
    currentUser={id:'staff',name:'员工',department:'产品部'};
    okrState.people=[...defaultPeople,{id:'staff',name:'员工',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
    const drafts=draftRecords.map((record,index)=>({...record,ownerId:'staff',payload:{title:'个人草稿'+(index+1),goalLevel:'personal' as const,goalModelVersion:2 as const,origin:'autonomous' as const,weight:50,deadline:'2026-09-30',keyResults:[{id:'container'+index,title:'个人草稿'+(index+1),weight:100,progress:0,deadline:'2026-09-30',assigneeIds:['staff'],executionActions:[{id:'a'+index,ownerId:'staff',title:'执行任务'+index,weight:100,progress:0,deadline:'2026-09-25'}]}]}}));
    okrState.records=drafts;okrState.okrs=draftOkrs.map((item,index)=>({...item,ownerId:'staff',objective:'个人草稿'+(index+1)}));
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByLabelText('编辑目标：个人草稿1'));
    fireEvent.click(await screen.findByRole('button',{name:'提交目标'}));
    await waitFor(()=>expect(okrState.updateOkr).toHaveBeenCalledWith('draft-objective-1',expect.objectContaining({title:'个人草稿1'}),true));
    expect(okrState.updateOkr).toHaveBeenCalledTimes(1);expect(screen.queryByText('确认主 KR 权重')).not.toBeInTheDocument();
  });

  it('routes reviewer requests to the confirmation workspace instead of my-goal alerts', async () => {
    const request: OkrRecord={...objectiveRecord,id:'manager-request',ownerId:'manager',payload:{title:'主管原目标'},changeRequest:{id:'request',status:'pending',purpose:'update',reason:'调整指标',reviewerId:'boss',baseVersion:1,requestedAt:'2026-09-15',payload:{title:'主管调整目标',weight:100,keyResults:[]}}};
    okrState.records=[objectiveRecord,request];
    render(<OKRPerformanceView/>);
    expect(screen.queryByText(/主管的目标修改待审核/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('待确认目标 1 项')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'目标确认'}));
    expect(await screen.findByLabelText('目标确认工作区')).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'主管调整目标'})).toBeInTheDocument();
    expect(screen.queryByLabelText('目标修改对比')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'提升年度经营质量'})).not.toBeInTheDocument();
  });

  it('opens reviews directly without the former primary tabs or goal sidebar', () => {
    render(<ReviewSummaryView />);
    expect(screen.getByRole('tab', { name: '写复盘总结' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^复盘总结$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /月度目标/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: '目标范围导航' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /写周报/ })).toBeInTheDocument();
  });
  it('shows the actual read failure and restores a monthly editor after retry without a false role warning', () => {
    currentUser = { id: 'staff', name: '员工', department: '产品部' };
    const people = [...defaultPeople, { id: 'staff', name: '员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 }];
    okrState.people = people;
    okrState.reviewableOkrs = [];
    const { rerender } = render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('button', { name: '写月报' }));
    expect(screen.getByLabelText('月复盘编辑器')).toBeInTheDocument();
    okrState.people = [];
    okrState.error = new Error('无法连接复盘数据服务');
    rerender(<ReviewSummaryView/>);
    expect(screen.getByText('复盘资料加载失败')).toBeInTheDocument();
    expect(screen.getByText('无法连接复盘数据服务。请重试，已填写的内容仍保留。')).toBeInTheDocument();
    expect(screen.queryByText('人员角色尚未确认')).not.toBeInTheDocument();
    const alert = screen.getByText('复盘资料加载失败').closest('.ant-alert')!;
    fireEvent.click(within(alert as HTMLElement).getByRole('button', { name: /重\s*试/ }));
    expect(okrState.refresh).toHaveBeenCalled();
    okrState.error = undefined;
    okrState.people = people;
    rerender(<ReviewSummaryView/>);
    expect(screen.getByLabelText('月复盘编辑器')).toBeInTheDocument();
  });

  it.each(['draft', 'submitted'] as const)('opens an employee monthly %s from the list in the monthly layout', async status => {
    currentUser = { id: 'staff', name: '员工', department: '产品部' };
    okrState.people = [...defaultPeople, { id: 'staff', name: '员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 }];
    const record: OkrRecord = { id: 'personal-month', ownerId: 'staff', kind: 'review', periodKey: '2026-09', version: 1, status,
      payload: { title: '个人月报', reviewType: 'month', reviewMode: 'monthly', startDate: '2026-09-01', endDate: '2026-09-30', suggestions: '已保存的问题建议' } };
    okrState.records = [record];
    okrState.reviewableOkrs = [];
    okrState.performances = [{ id: record.id, authorId: 'staff', type: 'month', reviewMode: 'monthly', cycleName: '个人月报', author: '员工', authorDept: '产品部',
      summary: '', uncompletedReason: '', suggestions: '', helpNeeded: '', sendTo: [], selfScore: 0, createdAt: '2026-09-15', status }];
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /我的复盘列表/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    expect(screen.getByLabelText('月复盘编辑器')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2026年第9月 月报-产品部' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '对公司或部门发展有帮助的意见和建议' })).toHaveValue('已保存的问题建议');
    if (status === 'draft') {
      expect(screen.getByRole('textbox', { name: '对公司或部门发展有帮助的意见和建议' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
      await waitFor(() => expect(okrState.saveReviewDraft).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2026-09-01', suggestions: '已保存的问题建议' })));
    } else {
      expect(screen.getByRole('textbox', { name: '对公司或部门发展有帮助的意见和建议' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '提交月报' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '复制为本期' }));
      expect(screen.getByRole('button', { name: '存草稿' })).toBeEnabled();
      expect(screen.getByRole('textbox', { name: '对公司或部门发展有帮助的意见和建议' })).toBeEnabled();
    }
  });

  it.each(['draft', 'submitted'] as const)('opens an employee weekly %s from the list in the monthly layout', async status => {
    currentUser = { id: 'staff', name: '员工', department: '产品部' };
    okrState.people = [...defaultPeople, { id: 'staff', name: '员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 }];
    const record: OkrRecord = { id: 'personal-week', ownerId: 'staff', kind: 'review', periodKey: '2026-09-14', version: 1, status,
      payload: { title: '个人周报', reviewType: 'week', reviewMode: 'structured', startDate: '2026-09-14', endDate: '2026-09-20', nextWeekPlan: '已保存的下周计划' } };
    okrState.records = [record];
    okrState.reviewableOkrs = [];
    okrState.performances = [{ id: record.id, authorId: 'staff', type: 'week', reviewMode: 'structured', cycleName: '个人周报', author: '员工', authorDept: '产品部',
      summary: '', uncompletedReason: '', suggestions: '', helpNeeded: '', sendTo: [], selfScore: 0, createdAt: '2026-09-15', status }];
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /我的复盘列表/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    expect(screen.getByRole('heading', { name: '2026年第 37 周 (09.14 - 09.20)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '下周计划' })).toHaveValue('已保存的下周计划');
    if (status === 'draft') {
      expect(screen.getByRole('textbox', { name: '下周计划' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
      await waitFor(() => expect(okrState.saveReviewDraft).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2026-09-14', nextWeekPlan: '已保存的下周计划' })));
    } else {
      expect(screen.getByRole('textbox', { name: '下周计划' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '提交周报' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '复制为本期' }));
      expect(screen.getByRole('button', { name: '存草稿' })).toBeEnabled();
      expect(screen.getByRole('textbox', { name: '下周计划' })).toBeEnabled();
    }
  });

  it('only exposes the supervisor filter to administrators and restricts regular members to their department', () => {
    currentUser = { id: 'boss', name: '老板', department: '管理层' };
    okrState.people = [...defaultPeople, { id: 'staff', name: '员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 }, { id: 'foreign', name: '外部门成员', department: '交付部', supervisorId: 'boss', rootFlag: 0, version: 1 }];
    okrState.performances = ['manager', 'staff', 'foreign'].map(authorId => ({ id: authorId, authorId, author: authorId === 'manager' ? '主管' : authorId === 'staff' ? '员工' : '外部门成员', authorDept: authorId === 'foreign' ? '交付部' : '产品部', type: 'week' as const, cycleName: '本轮周报', summary: '', selfScore: 0, uncompletedReason: '', suggestions: '', helpNeeded: '', sendTo: [], createdAt: '', status: 'submitted' as const }));
    const view = render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /看他人的复盘/ }));
    fireEvent.click(screen.getByRole('button', { name: '可以看的' }));
    expect(screen.getByRole('button', { name: /外部门成员.*本轮周报/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: '只看主管' }));
    expect(screen.getByRole('button', { name: /主管.*本轮周报/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /员工.*本轮周报/ })).not.toBeInTheDocument();
    view.unmount();
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /看他人的复盘/ }));
    fireEvent.click(screen.getByRole('button', { name: '可以看的' }));
    expect(screen.queryByRole('checkbox', { name: '只看主管' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /员工.*本轮周报/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /外部门成员.*本轮周报/ })).not.toBeInTheDocument();
  });

  it.each([['week', 'structured'], ['month', 'monthly'], ['week', 'supervisor'], ['month', 'supervisor']] as const)('opens received %s %s in the new read-only layout and records reading separately', async (type, mode) => {
    currentUser = { id: 'boss', name: '老板', department: '管理层' };
    const record: OkrRecord = { id: 'received', ownerId: 'manager', kind: 'review', periodKey: '2026-09', version: 2, status: 'reviewed',
      payload: { title: '收到的复盘', reviewType: type, reviewMode: mode, startDate: type === 'week' ? '2026-09-14' : '2026-09-01', endDate: type === 'week' ? '2026-09-20' : '2026-09-30',
        nextWeekPlan: '保存的计划', suggestions: '保存的问题', krReviews: [{ objectiveId: 'removed', objectiveTitle: '历史目标', keyResultId: 'removed-kr', keyResultTitle: '历史计划', previousProgress: 10, currentProgress: 42, health: 'normal', achievement: '历史成果', blocker: '', nextPlan: '', workIds: [] }] } };
    okrState.records = [record];
    okrState.reviewableOkrs = [];
    okrState.performances = [{ id: record.id, authorId: record.ownerId, type, reviewMode: mode, cycleName: '收到的复盘', author: '主管', authorDept: '产品部', summary: '', uncompletedReason: '', suggestions: '', helpNeeded: '', sendTo: [], selfScore: 0, createdAt: '2026-09-15', status: 'reviewed' }];
    const markViewed = vi.spyOn(okrRepository, 'markViewed').mockImplementation(async () => { record.viewedBy = ['boss']; });
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /看他人的复盘/ }));
    expect(screen.getByRole('checkbox', { name: '未读 (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /主管.*收到的复盘/ }));
    await waitFor(() => expect(document.querySelector(type === 'month' && mode !== 'supervisor' ? '.okr-monthly-review' : '.okr-weekly-editor')).toBeInTheDocument());
    expect(markViewed).toHaveBeenCalledWith('received', 'boss');
    expect(screen.getByRole('checkbox', { name: '未读 (0)' })).not.toBeChecked();
    expect(screen.getByText(/历史目标/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '复制为本期' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
    expect(record.status).toBe('reviewed');
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(screen.getByText('请选择一份复盘')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '可以看的' }));
    expect(screen.getByRole('checkbox', { name: '只看主管' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /主管.*收到的复盘/ })).toBeInTheDocument();
    markViewed.mockRestore();
  });

  it.each(['week', 'month'] as const)('submits the exact department %s draft with fresh exclusions from the list', async type => {
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    const record: OkrRecord = { id: 'department-draft', ownerId: 'manager', kind: 'review', periodKey: '2026-09', version: 1, status: 'draft', payload: { title: '部门复盘', reviewType: type, reviewMode: 'supervisor', startDate: '2026-09-01', endDate: '2026-09-30' } };
    okrState.people = [...defaultPeople, { id:'employee', name:'员工甲', department:'产品部', supervisorId:'manager', rootFlag:0, version:1 }];
    okrState.records = [record];
    okrState.performances = [{ id: record.id, authorId: record.ownerId, type, reviewMode: 'supervisor', cycleName: '部门复盘', author: '主管', authorDept: '产品部', summary: '', uncompletedReason: '', suggestions: '', helpNeeded: '', sendTo: [], selfScore: 0, createdAt: '2026-09-15', status:'draft' }];
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /我的复盘列表/ }));
    fireEvent.click(screen.getByRole('button', { name: /^提\s*交$/ }));
    const dialog = screen.getByRole('dialog', { name: type === 'week' ? '本轮部门周报提交' : '本轮部门月报提交' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name:'排除员工甲' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name:'员工甲排除原因' }), {target:{value:'本轮请假'}});
    fireEvent.click(within(dialog).getByRole('button', { name:/^提\s*交$/ }));
    await waitFor(()=>expect(okrState.submitReviewDraft).toHaveBeenCalledWith(record.id, [{employeeId:'employee',employeeName:'员工甲',reason:'本轮请假'}]));
  });

  it.each([['week', 'submitted'], ['month', 'submitted'], ['week', 'draft'], ['month', 'draft']] as const)('opens my department %s %s in the new layout', (type, status) => {
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    const record: OkrRecord = { id: 'department', ownerId: 'manager', kind: 'review', periodKey: '2026-09', version: 1, status, payload: { title: '部门复盘', reviewType: type, reviewMode: 'supervisor', startDate: type === 'week' ? '2026-09-14' : '2026-09-01', endDate: type === 'week' ? '2026-09-20' : '2026-09-30' } };
    okrState.records = [record];
    okrState.performances = [{ id: record.id, authorId: record.ownerId, type, reviewMode: 'supervisor', cycleName: '部门复盘', author: '主管', authorDept: '产品部', summary: '', uncompletedReason: '', suggestions: '', helpNeeded: '', sendTo: [], selfScore: 0, createdAt: '2026-09-15', status }];
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('tab', { name: /我的复盘列表/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    expect(document.querySelector('.okr-weekly-editor')).toBeInTheDocument();
    if (status === 'submitted') {
      expect(screen.getByRole('button', { name: '复制为本期' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', { name: '存草稿' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '复制为本期' })).not.toBeInTheDocument();
    }
  });

  it.each(['写周报', '写月报'])('tells the company root they are exempt when clicking %s', action => {
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(reviewToast).toHaveBeenCalledWith('info', '你无需写复盘总结');
    expect(screen.queryByRole('button', { name: '提交周报' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交月报' })).not.toBeInTheDocument();
    expect(screen.queryByText('老板周报模板待配置')).not.toBeInTheDocument();
  });

  it('opens the supervisor calculated KR template with employee support and no manual judgment', () => {
    currentUser = { id: 'manager', name: '主管', department: '产品部' };
    okrState.reviewableOkrs = [{ ...okr, ownerId: 'manager' }];
    render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('button', { name: '写周报' }));
    expect(screen.getByText('KR1：改善重点客户交付')).toBeInTheDocument();
    fireEvent.click(screen.getByText('KR1：改善重点客户交付'));
    expect(screen.getByRole('button', { name: /员工复盘支撑/ })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '改善重点客户交付主管判断与协调' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交周报' })).toBeInTheDocument();
  });

  it('keeps employee writing pending and exits it when the active person changes', () => {
    currentUser = { id: 'manager', name: '员工', department: '产品部' };
    okrState.people = defaultPeople.map(person => person.id === 'manager' ? { ...person, jobTitle: '产品经理' } : person);
    const { rerender } = render(<ReviewSummaryView/>);
    fireEvent.click(screen.getByRole('button', { name: '写周报' }));
    expect(screen.getByText('待填写')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交周报' })).toBeInTheDocument();
    currentUser = { id: 'boss', name: '老板', department: '管理层' };
    rerender(<ReviewSummaryView/>);
    expect(screen.getByRole('button', { name: '写周报' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交周报' })).not.toBeInTheDocument();
  });

  it('opens the requested goal editor once when navigating from reviews', () => {
    sessionStorage.setItem('shichuang.okr.addObjective', 'boss');
    render(<OKRPerformanceView />);
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
    expect(sessionStorage.getItem('shichuang.okr.addObjective')).toBeNull();
  });

  it('uses the scope sidebar and clears detail or breakdown state when switching scopes', async () => {
    const { container } = render(<OKRPerformanceView />);

    expect(screen.queryByRole('tab', { name: /月度目标/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^复盘总结$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '目标范围导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '我的目标' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /拆解目标/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' })).toBeInTheDocument();

    await openTargetDetails(screen.getByLabelText('目标：提升年度经营质量'));
    expect(await screen.findByText('目标详情')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: '目标节点详情' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '公司目标' }));
    await waitFor(() => expect(screen.queryByText('目标详情')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '我的目标' }));
    fireEvent.click(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' }));
    await waitFor(() => expect(screen.getByLabelText('目标名称')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '部门目标' }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page[aria-label="拆解目标"]')).not.toBeInTheDocument());
  });

  it('requests review with a required reason when editing an effective goal and returns to the list on cancel', async () => {
    okrState.records = [{ ...objectiveRecord, payload: { ...objectiveRecord.payload, keyResults: [{ ...objectiveRecord.payload.keyResults![0], deadline: '2026-09-30' }] } }];
    render(<OKRPerformanceView />);
    await openTargetDetails(screen.getByLabelText('目标：提升年度经营质量'));
    fireEvent.click(await screen.findByRole('button', { name: '修改目标' }));
    expect(screen.getByDisplayValue('提升年度经营质量')).toBeInTheDocument();
    expect(document.querySelector('.company-objective-drawer .okr-objective-form-stack .okr-objective-form-item')).toBeInTheDocument();
    expect(screen.getByLabelText('目标归属周期')).toBeDisabled();
    expect(screen.queryByRole('button', { name: '目标模板' })).not.toBeInTheDocument();
    expect(document.querySelector('.okr-objective-form .okr-objective-footer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: '修改后的目标' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(await screen.findByText('申请修改审核')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交申请' })).toBeDisabled();
    expect(okrState.updateOkr).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('修改原因'), { target: { value: '业务范围调整' } });
    fireEvent.click(screen.getByRole('button', { name: '提交申请' }));
    await waitFor(() => expect(okrState.updateOkr).toHaveBeenCalledWith('objective-1', expect.objectContaining({ title: '修改后的目标', changeReason: '业务范围调整' }), true));
    expect(await screen.findByLabelText('目标：提升年度经营质量')).toBeInTheDocument();
    await openTargetDetails(screen.getByLabelText('目标：提升年度经营质量'));
    fireEvent.click(screen.getByRole('button', { name: '修改目标' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^取\s*消$/ }).at(-1)!);
    expect(await screen.findByLabelText('目标：提升年度经营质量')).toBeInTheDocument();
    expect(screen.queryByText('目标详情')).not.toBeInTheDocument();
    expect(okrState.updateOkr).toHaveBeenCalledTimes(1);
  }, 15000);

  it('deletes only after confirmation and stays in detail when cancelled', async () => {
    render(<OKRPerformanceView />);
    await openTargetDetails(screen.getByLabelText('目标：提升年度经营质量'));
    fireEvent.click(await screen.findByRole('button', { name: '删除目标' }));
    const dialog = (await screen.findByText('确认删除此目标吗？')).closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancel|取\s*消/ }));
    expect(okrState.deleteOkr).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '删除目标' }));
    fireEvent.click(within((await screen.findByText('确认删除此目标吗？')).closest('[role="dialog"]') as HTMLElement).getByRole('button', { name: /^确\s*定$/ }));
    await waitFor(() => expect(okrState.deleteOkr).toHaveBeenCalledWith('objective-1'));
    await waitFor(() => expect(screen.queryByText('目标详情')).not.toBeInTheDocument());
  }, 15000);

  it('opens target creation from the sidebar primary action for the root user', async () => {
    okrState.records = [];
    okrState.okrs = [];
    const { container } = render(<OKRPerformanceView />);

    fireEvent.click(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' }));
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
    expect(container.querySelector('.okr-action-breakdown-page')).not.toBeInTheDocument();
  });

  it('opens department templates and confirms weights without saving on cancel', async () => {
    currentUser = {id:'manager',name:'主管',department:'产品部'};
    okrState.settings.objectiveTitleTemplates = ['交付目标', '质量目标'].map((title, index) => ({ id: String(index), department: '产品部', title, guidance: '', enabled: true, krTypes: ['support'] }));
    okrState.records = [{ ...objectiveRecord, payload: { ...objectiveRecord.payload, keyResults: ['a1','a2'].map(id => ({id,title:id,weight:50,progress:0,assigneeIds:['manager']})) } }];
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button', { name: '添加目标选项' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '部门目标' }));
    expect(await screen.findAllByLabelText('目标名称')).toHaveLength(4);
    expect(screen.getByRole('combobox',{name:'目标归属周期'})).toBeEnabled();
    const editor=screen.getAllByLabelText('目标名称')[0].closest('.ant-drawer-body') as HTMLElement;
    expect(within(editor).getByRole('button',{name:'添加目标'})).toBeEnabled();
    expect(screen.getAllByLabelText('目标名称')).toHaveLength(4);
    expect(screen.queryByRole('button',{name:'选择对齐'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'提交主管确认'}));
    const confirmation=(await screen.findByText('确认目标权重')).closest('[role="dialog"]') as HTMLElement;
    expect(within(confirmation).getByLabelText('O4权重')).toBeDisabled();
    expect(okrState.saveObjective).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole('button',{name:/取\s*消/}));
    expect(screen.getAllByLabelText('目标名称')).toHaveLength(4);
    expect(okrState.saveObjective).not.toHaveBeenCalled();
  }, 15000);

  it('keeps multiple supervisor KR branches, input and source IDs when switching reference views', async () => {
    currentUser = {id:'manager',name:'主管',department:'产品部'};
    okrState.settings.objectiveTitleTemplates = ['产品目标','风险目标'].map((title,index)=>({id:'multi'+index,title,department:'产品部',guidance:'',enabled:true,krTypes:['support']}));
    okrState.records = [objectiveRecord,{...objectiveRecord,id:'second-company',payload:{title:'第二公司目标',keyResults:[{id:'a2',title:'第二承接来源',weight:100,progress:0,assigneeIds:['manager']},{id:'other',title:'其他承接参考',weight:0,progress:0,assigneeIds:['someone']}]}}];
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));
    fireEvent.click(await screen.findByRole('menuitem',{name:'部门目标'}));
    expect(await screen.findAllByText('来源：O1 · 提升年度经营质量 / KR1 · 改善重点客户交付')).toHaveLength(2);
    expect(screen.getAllByText('来源：O2 · 第二公司目标 / KR1 · 第二承接来源')).toHaveLength(2);
    const inputs=await screen.findAllByLabelText('A1 期望达成的结果');
    expect(inputs).toHaveLength(4);
    fireEvent.change(inputs[0],{target:{value:'保留第一条输入'}});
    fireEvent.change(inputs[1],{target:{value:'保留第二条输入'}});
    fireEvent.click(screen.getByText('全部目标'));
    expect(screen.getByText('其他承接参考')).toBeVisible();
    fireEvent.click(screen.getAllByRole('button',{name:'定位填写'})[1]);
    expect(screen.getByRole('generic',{name:'目标填写块 3'})).toHaveClass('is-located');
    fireEvent.click(screen.getByText('我的承接'));
    expect(screen.getAllByLabelText('A1 期望达成的结果')[0]).toHaveValue('保留第一条输入');
    expect(screen.getAllByLabelText('A1 期望达成的结果')[1]).toHaveValue('保留第二条输入');
    fireEvent.click(screen.getByRole('button',{name:'存草稿'}));
    await waitFor(()=>expect(okrState.saveObjectiveDraft).toHaveBeenCalledTimes(4));
    expect(okrState.saveObjectiveDraft.mock.calls.map(call=>(call as unknown as [string,{sourceKrId:string}])[1].sourceKrId)).toEqual(['a1','a1','a2','a2']);
  });

  it.each(['staff','manager'])('preserves both %s action blocks and their independent department sources across reference switches', async ownerId => {
    currentUser={id:ownerId,name:'员工',department:'产品部'};
    okrState.people=[...defaultPeople,{id:'staff',name:'员工',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
    okrState.records=[objectiveRecord,...['first','second'].map((id,index):OkrRecord=>({...objectiveRecord,id,ownerId:'manager',payload:{title:'部门目标'+index,goalLevel:'department',sourceObjectiveId:objectiveRecord.id,sourceKrId:'a1',keyResults:[{id:'staff-kr'+index,title:'员工承接'+index,weight:100,progress:0,deadline:'2026-09-30',assigneeIds:[ownerId]}]}}))];
    render(<OKRPerformanceView/>);
    if(ownerId === 'staff') fireEvent.click(within(screen.getByRole('complementary',{name:'目标范围导航'})).getByRole('button',{name:'拆解目标'}));
    else {fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));fireEvent.click(await screen.findByRole('menuitem',{name:'我的目标'}));}
    const inputs=await screen.findAllByLabelText('计划动作内容');
    expect(screen.getAllByRole('button',{name:'定位填写'})).toHaveLength(2);
    expect(screen.queryByRole('button',{name:'选择来源'})).not.toBeInTheDocument();
    expect(document.querySelector('.okr-objective-footer')).not.toHaveTextContent('添加目标');
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0],{target:{value:'完成模块方案'}});
    fireEvent.change(inputs[1],{target:{value:'闭环风险事项'}});
    fireEvent.click(screen.getByText('全部目标'));
    expect(screen.getAllByLabelText('计划动作内容')[0]).toHaveValue('完成模块方案');
    expect(screen.getAllByLabelText('计划动作内容')[1]).toHaveValue('闭环风险事项');
    fireEvent.click(screen.getByText('我的承接'));
    fireEvent.click(screen.getByRole('button',{name:'存草稿'}));
    await waitFor(()=>expect(okrState.saveObjectiveDraft).toHaveBeenCalledTimes(2));
    expect(okrState.saveObjectiveDraft.mock.calls.map(call=>(call as unknown as [string,{sourceObjectiveId:string}])[1].sourceObjectiveId)).toEqual(['first','second']);
  });

  it('blocks department creation when company goals are not submitted', async () => {
    currentUser = {id:'manager',name:'主管',department:'产品部'};
    okrState.records=[]; okrState.okrs=[];
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));
    fireEvent.click(await screen.findByRole('menuitem',{name:'部门目标'}));
    expect(reviewToast).toHaveBeenCalledWith('warning','公司级目标还未提交，暂时无法添加目标');
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
  });

  it('allows company creation to append a blank target from the drawer footer', async () => {
    render(<OKRPerformanceView />);
    fireEvent.click(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' }));
    const editor = document.querySelector('.company-objective-drawer .ant-drawer-body') as HTMLElement;
    fireEvent.click(within(editor).getByRole('button', { name: '添加目标' }));
    expect(screen.getAllByLabelText('目标名称')).toHaveLength(2);
  }, 15000);

  it('protects the initial objective and removes only an added objective', async () => {
    render(<OKRPerformanceView />);
    fireEvent.click(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' }));
    fireEvent.change(await screen.findByLabelText('目标名称'), { target: { value: '保留的承诺目标' } });
    fireEvent.change(screen.getByLabelText('A1 名称'),{target:{value:'已有关键结果'}});
    expect(screen.queryByRole('button', { name: '删除新增目标 O1' })).not.toBeInTheDocument();
    const editor = screen.getByLabelText('目标名称').closest('.ant-drawer-body') as HTMLElement;
    fireEvent.click(within(editor).getByRole('button', { name: '添加目标' }));
    fireEvent.click(screen.getByRole('button', { name: '删除新增目标 O2' }));
    fireEvent.click(await screen.findByRole('button', { name: /^删\s*除$/ }));
    await waitFor(() => expect(screen.getAllByLabelText('目标名称')).toHaveLength(1));
    expect(screen.getByLabelText('目标名称')).toHaveValue('保留的承诺目标');
    expect(okrState.saveObjective).not.toHaveBeenCalled();
    expect(okrState.saveObjectiveDraft).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '删除新增目标 O1' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
  }, 15000);

  it('opens creation even when the root user already has a target in the cycle', async () => {
    render(<OKRPerformanceView />);

    fireEvent.click(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' }));

    expect(screen.queryByRole('region', { name: '目标逐级承接关系' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
  });

  it('does not open breakdown before organization information is available', () => {
    okrState.people = [];
    const { container } = render(<OKRPerformanceView />);
    expect(screen.getByRole('button', { name: '组织信息加载中' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '组织信息加载中' }));
    expect(container.querySelector('.okr-action-breakdown-page')).not.toBeInTheDocument();
  });

  it('creates a target in the single period selected by the user', async () => {
    okrState.records = [];
    okrState.okrs = [];
    const { container } = render(<OKRPerformanceView />);
    fireEvent.click(container.querySelector('.okr-cycle-filter .ant-select-clear') as HTMLElement);
    fireEvent.mouseDown(container.querySelector('.okr-cycle-filter .ant-select-content') as HTMLElement);
    fireEvent.click(screen.getByText('已结束'));
    fireEvent.click(screen.getByText(dayjs().subtract(1, 'month').format('YYYY年MM月')));

    fireEvent.click(within(screen.getByRole('complementary', { name: '目标范围导航' })).getByRole('button', { name: '添加目标' }));

    expect(document.querySelector('.company-objective-drawer .okr-objective-period')).toHaveTextContent(dayjs().subtract(1, 'month').format('YYYY年MM月'));
    expect(screen.getByLabelText('目标归属周期')).toBeInTheDocument();
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
  });

  it('creates a supervisor own-personal target from my scope and department target from department scope', async () => {
    currentUser={id:'manager',name:'主管',department:'产品部'};
    okrState.records=[objectiveRecord,{...objectiveRecord,id:'department-own',ownerId:'manager',payload:{goalLevel:'department',title:'部门已生效目标',keyResults:[{id:'own-kr',title:'本人部门 KR',weight:100,progress:0,assigneeIds:['manager']}]}}]; okrState.okrs=[];
    const view=render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));
    fireEvent.click(await screen.findByRole('menuitem',{name:'我的目标'}));
    expect(screen.getByText('个人级')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('计划动作内容'),{target:{value:'完成本人工作'}});
    fireEvent.click(screen.getByRole('button',{name:'提交主管确认'}));
    await waitFor(()=>expect(okrState.saveObjective).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({goalLevel:'personal',sourceObjectiveId:'department-own',sourceKrId:'own-kr',origin:'assigned',keyResults:[expect.objectContaining({executionActions:[expect.objectContaining({title:'完成本人工作'})]})]})));
    view.unmount();
    okrState.settings.objectiveTitleTemplates = [{ id: 'department', department: '产品部', title: '部门目标', guidance: '', enabled: true, krTypes: ['support'] }];
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'部门目标'}));
    fireEvent.click(screen.getByRole('button',{name:'添加目标'}));
    expect(await screen.findByText('部门级')).toBeInTheDocument();
    expect(screen.queryByLabelText('计划动作内容')).not.toBeInTheDocument();
  });

  it.each(['sidebar','list','card'])('uses the compact personal action form for manager %s creation', async entry => {
    currentUser={id:'manager',name:'主管',department:'产品部'};
    const upstream:OkrRecord={...objectiveRecord,id:'dept-live',ownerId:'manager',payload:{title:'本部门已生效目标',goalLevel:'department',keyResults:[{id:'mine',title:'本人部门KR',weight:100,progress:0,assigneeIds:['manager']}]}};
    okrState.records=[objectiveRecord,upstream]; okrState.okrs=[]; okrState.settings.defaultView=entry==='card'?'card':'list';
    render(<OKRPerformanceView/>);
    if(entry==='sidebar') { fireEvent.click(screen.getByRole('button',{name:'添加目标选项'})); fireEvent.click(await screen.findByRole('menuitem',{name:'我的目标'})); }
    else fireEvent.click(screen.getByRole('button',{name:'添加目标'}));
    expect(await screen.findByLabelText('计划动作内容')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
    expect(screen.getByLabelText('KR标识')).toBeInTheDocument();
    expect(screen.getByRole('region',{name:'目标承接链路'})).toHaveTextContent('本部门已生效目标');
    expect(screen.getByRole('combobox',{name:'目标归属周期'})).toBeEnabled();
  });
  const referenceCases = ['manager-personal', 'manager-department', 'employee-personal'] as const;
  function prepareReferenceCase(scenario: typeof referenceCases[number]) {
    const department = scenario === 'manager-department';
    const employee = scenario === 'employee-personal';
    currentUser={id:employee?'staff':'manager',name:employee?'员工':'主管',department:'产品部'};
    okrState.people=[...defaultPeople,{id:'staff',name:'员工',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
    const upstream: OkrRecord={...objectiveRecord,id:'department-source',ownerId:'manager',payload:{title:'参考部门目标',goalLevel:'department',sourceObjectiveId:objectiveRecord.id,sourceKrId:'a1',keyResults:[{id:'department-kr',title:'本人执行来源',weight:100,progress:0,deadline:'2026-09-30',assigneeIds:['manager','staff']}]}};
    const extra: OkrRecord={...objectiveRecord,id:'extra-company',payload:{title:'全部公司参考',goalLevel:'company',keyResults:[{id:'extra-kr',title:'其他人的KR',weight:100,progress:0,assigneeIds:['other']}]}};
    okrState.records=[objectiveRecord,extra,upstream];
    okrState.okrs=[];
    return {department,employee,upstream};
  }
  it.each(referenceCases.flatMap(scenario=>['sidebar','list','card'].map(entry=>({scenario,entry}))))('shares reference design for $scenario via $entry creation', async ({scenario,entry}) => {
    const {department,employee}=prepareReferenceCase(scenario);
    okrState.settings.defaultView=entry==='card'?'card':'list';
    render(<OKRPerformanceView/>);
    if(entry==='sidebar') {
      if(employee) fireEvent.click(screen.getByRole('button',{name:'拆解目标'}));
      else {fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));fireEvent.click(await screen.findByRole('menuitem',{name:department?'部门目标':'我的目标'}));}
    } else {
      if(department) fireEvent.click(screen.getByRole('button',{name:'部门目标'}));
      fireEvent.click(screen.getByRole('button',{name:'添加目标'}));
    }
    const tree=await screen.findByRole('region',{name:'目标承接链路'});
    expect(within(tree).getByRole('radio',{name:'我的承接'})).toBeChecked();
    expect(within(tree).getByText(department ? '本部门承接' : '本人承接')).toBeVisible();
    if (!department) expect(within(tree).getByText('本人执行来源')).toBeVisible();
    expect(screen.getByText(department ? '来源：O1 · 提升年度经营质量 / KR1 · 改善重点客户交付' : '来源：O1 · 参考部门目标 / KR1 · 本人执行来源')).toBeVisible();
    if (!department) expect(screen.queryByRole('button',{name:'选择对齐'})).not.toBeInTheDocument();
    const input=screen.getByLabelText(department?'目标名称':'计划动作内容');
    fireEvent.change(input,{target:{value:'跨入口保留填写'}});
    fireEvent.click(within(tree).getByText('全部目标'));
    expect(within(tree).getByText('全部公司参考')).toBeVisible();
    if(department) expect(within(tree).queryByText('参考部门目标')).not.toBeInTheDocument();
    else expect(within(tree).getByText('参考部门目标')).toBeVisible();
    fireEvent.click(within(tree).getByText('我的承接'));
    expect(input).toHaveValue('跨入口保留填写');
  });

  it.each(referenceCases.flatMap(scenario=>['list','card'].flatMap(view=>['draft','active'].map(status=>({scenario,view,status})))) )('shares reference design for $scenario $status editing in $view',async({scenario,view,status})=>{
    const {department}=prepareReferenceCase(scenario);
    const own: OkrRecord={...objectiveRecord,id:'editing-reference-target',ownerId:currentUser.id,status,payload:{goalModelVersion:2,goalLevel:department?'department':'personal',origin:'assigned',title:'本次编辑目标',sourceObjectiveId:department?objectiveRecord.id:'department-source',sourceKrId:department?'a1':'department-kr',keyResults:[{id:'editing-kr',title:'执行内容',weight:100,progress:0,deadline:'2026-09-30',structureType:'support',action:'执行内容',result:'完成结果',assigneeIds:[currentUser.id],executionActions:[{id:'editing-action',ownerId:currentUser.id,title:'原有个人计划',weight:100,progress:0,deadline:'2026-09-30'}]}]}};
    okrState.records=[...okrState.records,own];
    okrState.okrs=[{...okr,id:own.id,ownerId:own.ownerId,objective:own.payload.title,status:status === 'draft' ? 'draft' : 'active'}];
    okrState.settings.defaultView=view as 'list'|'card';
    render(<OKRPerformanceView/>);
    if(department) fireEvent.click(screen.getByRole('button',{name:'部门目标'}));
    await openTargetDetails(screen.getByLabelText((view==='card'?'目标卡片：':'目标：')+'本次编辑目标'));
    fireEvent.click(await screen.findByRole('button',{name:'修改目标'}));
    const tree=await screen.findByRole('region',{name:'目标承接链路'});
    expect(within(tree).getByRole('radio',{name:'我的承接'})).toBeChecked();
    expect(within(tree).getByText(department ? '本部门承接' : '本人承接')).toBeVisible();
    if (!department) expect(within(tree).getByText('本人执行来源')).toBeVisible();
    expect(screen.getByText(department ? '来源：O1 · 提升年度经营质量 / KR1 · 改善重点客户交付' : '来源：O1 · 参考部门目标 / KR1 · 本人执行来源')).toBeVisible();
    if (!department) expect(screen.queryByRole('button',{name:'选择对齐'})).not.toBeInTheDocument();
    const input=screen.getByLabelText(department?'目标名称':'计划动作内容');
    fireEvent.change(input,{target:{value:'编辑保留内容'}});
    fireEvent.click(within(tree).getByText('全部目标'));
    expect(within(tree).getByText('全部公司参考')).toBeVisible();
    if(department) expect(within(tree).queryByText('参考部门目标')).not.toBeInTheDocument();
    else expect(within(tree).getByText('参考部门目标')).toBeVisible();
    expect(within(tree).queryByRole('button',{name:'定位填写'})).not.toBeInTheDocument();
    fireEvent.click(within(tree).getByText('我的承接'));
    expect(input).toHaveValue('编辑保留内容');
    expect(okrState.saveObjective).not.toHaveBeenCalled();
    expect(okrState.updateOkr).not.toHaveBeenCalled();
  });

  it.each([2,3])('initializes only unused department templates with %s templates occupied', async occupied => {
    currentUser={id:'manager',name:'主管',department:'产品部'};
    okrState.settings.objectiveTitleTemplates=[1,2,3].map(i=>({id:'t'+i,title:'模板'+i,department:'产品部',enabled:true,guidance:'',krTypes:['support']}));
    okrState.records=[objectiveRecord,...Array.from({length:occupied},(_,i)=>({...objectiveRecord,id:'used'+i,ownerId:'manager',status:'draft',payload:{title:'模板'+(i+1),goalLevel:'department' as const,objectiveTitleTemplateId:'t'+(i+1),sourceObjectiveId:objectiveRecord.id,sourceKrId:'a1'}}))];
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'})); fireEvent.click(await screen.findByRole('menuitem',{name:'部门目标'}));
    const input=await screen.findByLabelText('目标名称');
    expect(input).toHaveValue(occupied===2?'模板3':'');
    expect(input).toHaveProperty('readOnly',occupied===2);
    expect(screen.getByRole('button',{name:'添加目标'})).toBeEnabled();
    if(occupied===3) expect(screen.getByLabelText('目标编号 O1')).toHaveTextContent('TO1');
  });
  it('offers only upstream periods and reinitializes after period confirmation', async()=>{
    const confirmation=vi.spyOn(Modal,'confirm').mockReturnValue({destroy:vi.fn(),update:vi.fn()});
    currentUser={id:'manager',name:'主管',department:'产品部'};
    okrState.records=[objectiveRecord,{...objectiveRecord,id:'oct',periodKey:'2026-10'}];
    render(<OKRPerformanceView/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'})); fireEvent.click(await screen.findByRole('menuitem',{name:'部门目标'}));
    fireEvent.mouseDown(await screen.findByRole('combobox',{name:'目标归属周期'}));
    expect(screen.getByText('2026年10月',{selector:'.ant-select-item-option-content'})).toBeInTheDocument();
    expect(screen.queryByText('2026年11月',{selector:'.ant-select-item-option-content'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('2026年10月',{selector:'.ant-select-item-option-content'}));
    expect(confirmation).toHaveBeenCalledWith(expect.objectContaining({title:'切换目标周期？',cancelText:'取消'}));
    await act(async()=>{ await confirmation.mock.calls[0][0].onOk?.(); });
    await waitFor(()=>expect(document.querySelector('.goal-editor-heading')).toHaveTextContent('2026年10月'));
  });
  it('has no objective-copy entry in creation or list', () => {
    render(<OKRPerformanceView/>);
    expect(screen.queryByRole('button',{name:'复制目标'})).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('complementary',{name:'目标范围导航'})).getByRole('button',{name:'添加目标'}));
    expect(screen.queryByRole('button',{name:'复制目标'})).not.toBeInTheDocument();
  });

  it('offers next month under the not-started period group', () => {
    const { container } = render(<OKRPerformanceView />);
    fireEvent.mouseDown(container.querySelector('.okr-cycle-filter .ant-select-content') as HTMLElement);
    fireEvent.click(screen.getByText('未开始'));

    expect(screen.getByText(dayjs().add(1, 'month').format('YYYY年MM月'))).toBeInTheDocument();
    expect(screen.queryByText('已归档')).not.toBeInTheDocument();
  });

  it('appends breakdown saves and keeps every saved month selected', () => {
    const august = { id: 'august-save', periodKey: '2026-08', mode: 'draft' as const, groups: [], savedAt: '2026-08-31T10:00:00Z' };
    const september = { id: 'september-save', periodKey: '2026-09', mode: 'draft' as const, groups: [], savedAt: '2026-09-30T10:00:00Z' };
    const secondSeptember = { ...september, id: 'september-save-2' };

    const saved = appendDemoBreakdown(appendDemoBreakdown(appendDemoBreakdown([], august), september), secondSeptember);
    expect(saved.map(item => item.id)).toEqual(['august-save', 'september-save', 'september-save-2']);
    expect(includeSelectedCycle(includeSelectedCycle(['2026-09'], '2026-08'), '2026-09')).toEqual(['2026-09', '2026-08']);
  });

  it('shows demo breakdowns only in my targets for a selected month', () => {
    const breakdown = { id: 'demo-save', periodKey: '2026-09', mode: 'draft' as const, groups: [], savedAt: '2026-09-30T10:00:00Z' };

    expect(filterVisibleDemoBreakdowns([breakdown], ['2026-09'], 'my')).toEqual([breakdown]);
    for (const category of ['supervisor', 'subordinate', 'department', 'otherDepartments'] as const) {
      expect(filterVisibleDemoBreakdowns([breakdown], ['2026-09'], category)).toEqual([]);
    }
  });

  it('lists every same-month objective draft by its unique record id', () => {
    okrState.records = [objectiveRecord, ...draftRecords];
    okrState.okrs = [okr, ...draftOkrs];

    render(<OKRPerformanceView />);

    expect(screen.getByLabelText('目标：草稿目标一')).toBeInTheDocument();
    expect(screen.getByLabelText('目标：草稿目标二')).toBeInTheDocument();
    expect(screen.getAllByText('草稿目标一')).toHaveLength(1);
    expect(screen.getAllByText('草稿目标二')).toHaveLength(1);
  });

  it('defaults to the list view and switches the same targets to cards', () => {
    const { container } = render(<OKRPerformanceView />);

    const listButton = screen.getByRole('button', { name: '列表视图' });
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
    expect(listButton).toHaveClass('is-selected');
    expect(listButton).not.toHaveClass('ant-btn-primary');
    expect(container.querySelector('.okr-summary-month-body')).toHaveClass('is-target-view');
    expect(screen.getByLabelText('目标：提升年度经营质量')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '卡片视图' }));
    const cardButton = screen.getByRole('button', { name: '卡片视图' });
    expect(cardButton).toHaveAttribute('aria-pressed', 'true');
    expect(cardButton).toHaveClass('is-selected');
    expect(cardButton).not.toHaveClass('ant-btn-primary');
    expect(screen.getByLabelText('目标卡片：提升年度经营质量')).toBeInTheDocument();
  });

  it('opens objective drafts in the editable form with their original content', async () => {
    okrState.records = [objectiveRecord, ...draftRecords];
    okrState.okrs = [okr, ...draftOkrs];

    render(<OKRPerformanceView />);
    const draftTarget = screen.getByLabelText('目标：草稿目标一');
    await openTargetDetails(draftTarget);
    fireEvent.click(await screen.findByRole('button', { name: '修改目标' }));

    expect(await screen.findByLabelText('目标名称')).toHaveValue('草稿目标一');
    expect(screen.queryByRole('region', { name: '目标逐级承接关系' })).not.toBeInTheDocument();
  });

  it('isolates personal targets from unrelated scopes and keeps drafts out of department scope', async () => {
    okrState.records = [objectiveRecord, ...draftRecords];
    okrState.okrs = [okr, ...draftOkrs];

    render(<OKRPerformanceView />);
    expect(screen.getByLabelText('目标：草稿目标一')).toBeInTheDocument();

    for (const category of ['部门目标', '其他部门']) {
      fireEvent.click(screen.getByRole('button', { name: category }));
      await waitFor(() => expect(screen.queryByText('提升年度经营质量')).not.toBeInTheDocument());
      expect(screen.queryByText('草稿目标一')).not.toBeInTheDocument();
      expect(screen.queryByText('草稿目标二')).not.toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: '我部门的' }));
    expect(screen.getByText('提升年度经营质量')).toBeInTheDocument();
    expect(screen.queryByText('草稿目标一')).not.toBeInTheDocument();
    expect(screen.queryByText('草稿目标二')).not.toBeInTheDocument();
  });

  it('centers empty scopes without hiding another member\'s real target', () => {
    okrState.records = [{ ...objectiveRecord, ownerId: 'manager', id: 'manager-target', payload: { ...objectiveRecord.payload, title: '部门真实目标' } }];
    okrState.okrs = [{ ...okr, id: 'manager-target', ownerId: 'manager', objective: '部门真实目标' }];
    const { container } = render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: '公司目标' }));
    const empty = container.querySelector('.okr-target-empty');
    expect(empty).toBeInTheDocument();
    expect(empty?.closest('.okr-target-month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `收起${dayjs().format('YYYY年MM月')}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '卡片视图' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '周期筛选' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '其他部门' }));
    expect(screen.getByText('部门真实目标')).toBeInTheDocument();
  });

  it('does not show draft targets in department summaries or for selected members', async () => {
    const draft = { ...objectiveRecord, id: 'consultant-draft', ownerId: 'manager', status: 'draft', payload: { ...objectiveRecord.payload, title: '专家顾问草稿目标' } };
    okrState.records = [draft];
    okrState.okrs = [{ ...okr, id: draft.id, ownerId: draft.ownerId, status: 'draft', objective: draft.payload.title }];
    render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: '其他部门' }));
    expect(screen.queryByText('专家顾问草稿目标')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '其他部门' }));
    expect(screen.queryByText('专家顾问草稿目标')).not.toBeInTheDocument();
  });

  it('excludes organization department when session department is stale',()=>{
 currentUser={id:'manager',name:'主管',department:'旧部门'};
 const own={...objectiveRecord,id:'own-org',ownerId:'same',payload:{...objectiveRecord.payload,title:'同部门目标'}};const other={...objectiveRecord,id:'other-org',ownerId:'other',payload:{...objectiveRecord.payload,title:'跨部门目标'}};
 okrState.people=[...defaultPeople,{id:'same',name:'同部门成员',department:' 产品部 ',supervisorId:'manager',rootFlag:0,version:1},{id:'other',name:'外部门成员',department:'交付部',supervisorId:'boss',rootFlag:0,version:1}];
 okrState.records=[own,other];okrState.okrs=[{...okr,id:own.id,ownerId:own.ownerId,objective:own.payload.title},{...okr,id:other.id,ownerId:other.ownerId,objective:other.payload.title}];render(<OKRPerformanceView/>);
 fireEvent.click(screen.getByRole('button',{name:'其他部门'}));expect(screen.queryByLabelText('目标：同部门目标')).not.toBeInTheDocument();expect(screen.getByLabelText('目标：跨部门目标')).toBeInTheDocument();
 });

  it('keeps the other-department summary and narrows it for a selected department', () => {
    const consultantTarget = { ...objectiveRecord, id: 'consultant-target', ownerId: 'consultant', payload: { ...objectiveRecord.payload, title: '专家顾问目标' } };
    okrState.people = [
      ...defaultPeople,
      { id: 'consultant', name: '顾问成员', department: '专家顾问部', supervisorId: 'boss', rootFlag: 0, version: 1 },
      { id: 'designer', name: '设计成员', department: '交互设计部', supervisorId: 'boss', rootFlag: 0, version: 1 },
    ];
    okrState.records = [consultantTarget];
    okrState.okrs = [{ ...okr, id: consultantTarget.id, ownerId: consultantTarget.ownerId, objective: consultantTarget.payload.title }];
    const { container } = render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: '其他部门' }));
    expect(screen.getByLabelText('目标：专家顾问目标')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标卡片：专家顾问目标')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '交互设计部' }));
    expect(screen.getByRole('heading', { name: '交互设计部' })).toBeInTheDocument();
    expect(screen.queryByText('专家顾问目标')).not.toBeInTheDocument();
    expect(container.querySelector('.okr-target-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '专家顾问部' }));
    expect(screen.getByRole('heading', { name: '专家顾问部' })).toBeInTheDocument();
    expect(screen.getByLabelText('目标：专家顾问目标')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '卡片视图' }));
    expect(screen.getByLabelText('目标卡片：专家顾问目标')).toBeInTheDocument();
  });

  it('includes the current user in the current-department scope', () => {
    render(<OKRPerformanceView />);
    fireEvent.click(screen.getByRole('button', { name: '我部门的' }));

    expect(screen.getByRole('heading', { name: '我部门的' })).toBeInTheDocument();
    expect(screen.getByLabelText('目标：提升年度经营质量')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `收起${dayjs().format('YYYY年MM月')}` })).toBeInTheDocument();
  });

  it('defaults the period filter to the current cycle without a settings entry', () => {
    render(<OKRPerformanceView />);

    expect(screen.getByRole('combobox', { name: '周期筛选' })).toBeInTheDocument();
    expect(document.querySelector('.okr-cycle-filter')).toHaveTextContent(`周期：${dayjs().format('YYYY年MM月')}`);
    expect(screen.queryByRole('button', { name: '目标设置' })).not.toBeInTheDocument();
  });

  it('shows the selected cycle count after selecting a second month', () => {
    const { container } = render(<OKRPerformanceView />);
    fireEvent.mouseDown(container.querySelector('.okr-cycle-filter .ant-select-content') as HTMLElement);
    fireEvent.click(screen.getByText('已结束'));
    fireEvent.click(screen.getByText(dayjs().subtract(1, 'month').format('YYYY年MM月')));
    expect(container.querySelector('.okr-cycle-filter')).toHaveTextContent('周期：2个周期');
    fireEvent.click(screen.getByRole('button', { name: '其他部门' }));
    expect(screen.getByText(`${dayjs().format('YYYY年MM月')}暂无目标`)).toBeInTheDocument();
    expect(screen.getByText(`${dayjs().subtract(1, 'month').format('YYYY年MM月')}暂无目标`)).toBeInTheDocument();
    expect(container.querySelectorAll('.okr-target-empty')).toHaveLength(2);
  });

it.each(['manager-department','manager-personal','employee-personal'] as const)('selects a challenge source after all assignments are used for %s without losing input', async scenario => {
  const {department,upstream}=prepareReferenceCase(scenario);
  const source=department?objectiveRecord:upstream;
  const first=source.payload.keyResults![0];
  const second={...first,id:'second-assigned',title:'第二本人指派',assigneeIds:[currentUser.id]};
  okrState.records=okrState.records.map(row=>row.id===source.id?{...row,payload:{...row.payload,keyResults:[first,second,{...first,id:'others-only',title:'其他人的来源',assigneeIds:['other']}]}}:row);
  // Both original assignments already have goals; new work must choose a source.
  const used=[first,second].map((kr,index):OkrRecord=>({...source,id:'used-source-'+index,ownerId:currentUser.id,status:index?'active':'draft',payload:{title:'已经承接'+index,goalLevel:department?'department':'personal',sourceObjectiveId:source.id,sourceKrId:kr.id}}));
  okrState.records=[...okrState.records,...used];
  okrState.settings.objectiveTitleTemplates=[];
  render(<OKRPerformanceView/>);
  if(scenario==='employee-personal') fireEvent.click(screen.getByRole('button',{name:'拆解目标'}));
  else {fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));fireEvent.click(await screen.findByRole('menuitem',{name:department?'部门目标':'我的目标'}));}
  const picker=await screen.findByRole('button',{name:'选择来源'});
  expect(screen.queryByRole('combobox',{name:'填写块1来源'})).not.toBeInTheDocument();
  expect(screen.queryByText('来源：自主提出')).not.toBeInTheDocument();
  const input=screen.getByLabelText(department?'目标名称':'计划动作内容');
  fireEvent.change(input,{target:{value:'切换来源保留内容'}});
  fireEvent.click(screen.getByRole('button',{name:'存草稿'}));
  expect(await screen.findByText('请选择挑战目标来源')).toBeVisible();
  expect(okrState.saveObjectiveDraft).not.toHaveBeenCalled();
  fireEvent.click(picker);
  const secondLabel=`O1 · ${source.payload.title} / KR2 · 第二本人指派`;
  fireEvent.click(await screen.findByText(secondLabel,{selector:'.ant-dropdown-menu-title-content'}));
  expect(await screen.findByText('来源：'+secondLabel)).toBeVisible();
  expect(input).toHaveValue('切换来源保留内容');
  expect(screen.queryByRole('button',{name:'定位填写'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'更换来源'}));
  const firstLabel=`O1 · ${source.payload.title} / KR1 · ${first.title}`;
  fireEvent.click(await screen.findByText(firstLabel,{selector:'.ant-dropdown-menu-title-content'}));
  expect(await screen.findByText('来源：'+firstLabel)).toBeVisible();
  expect(screen.getByLabelText(department?'目标名称':'计划动作内容')).toHaveValue('切换来源保留内容');
  await waitFor(()=>expect(screen.getByRole('button',{name:/存草稿/})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:/存草稿/}));
  await waitFor(()=>expect(okrState.saveObjectiveDraft).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({sourceObjectiveId:source.id,sourceKrId:first.id,origin:'autonomous'})));
});

});
