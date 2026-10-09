// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import type { OkrRecord } from '../../services/okrRepository';
import type { OKRItem } from '../../types';

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
  { id: 'boss', name: '老板', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
];

const okrState = {
  records: [objectiveRecord],
  okrs: [okr],
  reviewableOkrs: [okr],
  performances: [],
  people: defaultPeople,
  work: [],
  actionParents: [actionParent],
  productLineOptions: ['真实产品'],
  projectOptions: ['真实交付项目'],
  businessOptionsLoading: false,
  businessOptionsError: undefined,
  loading: false,
  error: undefined,
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
  settings: { defaultView: 'list', timeRules: [], validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: false, resultRequired: true }, dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, templates: [] },
  saveSettings: vi.fn(async () => true),
};

vi.mock('./okr/useOriginalOkr', () => ({ useOriginalOkr: () => okrState }));
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ currentUser: { id: 'boss', name: '老板', department: '管理层' }, addToast: vi.fn() }),
  useAppNavigationContext: () => ({ openPageTab: vi.fn() }),
}));

import { appendDemoBreakdown, filterVisibleDemoBreakdowns, includeSelectedCycle, OKRPerformanceView, ReviewSummaryView } from './OKRPerformanceView';

describe('OKRPerformanceView target navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T12:00:00+08:00'));
    vi.clearAllMocks();
    sessionStorage.clear();
    okrState.records = [objectiveRecord];
    okrState.okrs = [okr];
    okrState.reviewableOkrs = [okr];
    okrState.people = defaultPeople;
  });

  afterEach(() => vi.useRealTimers());

  it('opens reviews directly without the former primary tabs or goal sidebar', () => {
    render(<ReviewSummaryView />);
    expect(screen.getByRole('tab', { name: '写复盘总结' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^复盘总结$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /月度目标/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: '目标范围导航' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /写周报/ })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: '添加目标' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('目标：提升年度经营质量'));
    expect(await screen.findByText('目标详情')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: '目标节点详情' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '直属上级' }));
    await waitFor(() => expect(screen.queryByText('目标详情')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '我的目标' }));
    fireEvent.click(screen.getByRole('button', { name: '添加目标' }));
    await waitFor(() => expect(screen.getByLabelText('目标名称')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '直属下级' }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page[aria-label="拆解目标"]')).not.toBeInTheDocument());
  });

  it('edits a submitted goal without resubmitting and returns to detail on cancel', async () => {
    okrState.records = [{ ...objectiveRecord, payload: { ...objectiveRecord.payload, keyResults: [{ ...objectiveRecord.payload.keyResults![0], deadline: '2026-09-30' }] } }];
    render(<OKRPerformanceView />);
    fireEvent.click(screen.getByLabelText('目标：提升年度经营质量'));
    fireEvent.click(await screen.findByRole('button', { name: '修改目标' }));
    expect(screen.getByDisplayValue('提升年度经营质量')).toBeInTheDocument();
    expect(document.querySelector('.company-objective-drawer .okr-objective-form-stack .okr-objective-form-item')).toBeInTheDocument();
    expect(screen.getByLabelText('目标归属周期')).toBeDisabled();
    expect(screen.getByRole('button', { name: '目标模板' })).toBeDisabled();
    expect(document.querySelector('.okr-objective-form .okr-objective-footer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: '修改后的目标' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    await waitFor(() => expect(okrState.updateOkr).toHaveBeenCalledWith('objective-1', expect.objectContaining({ title: '修改后的目标' }), false));
    expect(await screen.findByText('目标详情')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '修改目标' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^取\s*消$/ }).at(-1)!);
    expect(await screen.findByText('目标详情')).toBeInTheDocument();
    expect(okrState.updateOkr).toHaveBeenCalledTimes(1);
  }, 15000);

  it('deletes only after confirmation and stays in detail when cancelled', async () => {
    render(<OKRPerformanceView />);
    fireEvent.click(screen.getByLabelText('目标：提升年度经营质量'));
    fireEvent.click(await screen.findByRole('button', { name: '删除目标' }));
    const dialog = (await screen.findByText('删除目标', { selector: '.ant-modal-title' })).closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancel|取消/ }));
    expect(okrState.deleteOkr).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '删除目标' }));
    fireEvent.click(within((await screen.findByText('删除目标', { selector: '.ant-modal-title' })).closest('[role="dialog"]') as HTMLElement).getByRole('button', { name: /^删\s*除$/ }));
    await waitFor(() => expect(okrState.deleteOkr).toHaveBeenCalledWith('objective-1'));
    await waitFor(() => expect(screen.queryByText('目标详情')).not.toBeInTheDocument());
  }, 15000);

  it('opens target creation from the sidebar primary action for the root user', async () => {
    okrState.records = [];
    okrState.okrs = [];
    const { container } = render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: '添加目标' }));
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
    expect(container.querySelector('.okr-action-breakdown-page')).not.toBeInTheDocument();
  });

  it('opens creation even when the root user already has a target in the cycle', async () => {
    render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: '添加目标' }));

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

    fireEvent.click(screen.getByRole('button', { name: '添加目标' }));

    expect(document.querySelector('.company-objective-drawer .okr-objective-period')).toHaveTextContent(dayjs().subtract(1, 'month').format('YYYY年MM月'));
    expect(screen.getByLabelText('目标归属周期')).toBeInTheDocument();
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();
  });

  it('copies only a submitted historical objective into an editable TO', async () => {
    render(<OKRPerformanceView />);
    fireEvent.click(screen.getByRole('button', { name: '添加目标' }));
    fireEvent.mouseDown(screen.getByLabelText('目标归属周期'));
    fireEvent.click(await screen.findByText(dayjs().add(1, 'month').format('YYYY年MM月')));
    expect(screen.getByText(`${dayjs().add(1, 'month').format('YYYY年MM月')}目标`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制目标' }));
    const dialog = document.querySelector('.company-copy-modal') as HTMLElement;
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('提升年度经营质量')).toBeInTheDocument();
    expect(within(dialog).queryByText('草稿目标一')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: /确定/ }));
    expect(screen.getByLabelText('目标编号 O2')).toHaveTextContent('TO2');
    expect(screen.getByDisplayValue('提升年度经营质量')).toBeInTheDocument();
    expect(screen.getByDisplayValue('改善重点客户交付')).toBeInTheDocument();
    expect(okrState.saveObjective).not.toHaveBeenCalled();
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
    fireEvent.click(draftTarget);
    fireEvent.click(await screen.findByRole('button', { name: '修改目标' }));

    expect(await screen.findByLabelText('目标名称')).toHaveValue('草稿目标一');
    expect(screen.queryByRole('region', { name: '目标逐级承接关系' })).not.toBeInTheDocument();
  });

  it('isolates personal targets from unrelated scopes and keeps drafts out of department scope', async () => {
    okrState.records = [objectiveRecord, ...draftRecords];
    okrState.okrs = [okr, ...draftOkrs];

    render(<OKRPerformanceView />);
    expect(screen.getByLabelText('目标：草稿目标一')).toBeInTheDocument();

    for (const category of ['直属上级', '直属下级', '其他部门']) {
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

    fireEvent.click(screen.getByRole('button', { name: '直属上级' }));
    const empty = container.querySelector('.okr-target-empty');
    expect(empty).toBeInTheDocument();
    expect(empty?.closest('.okr-target-month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `收起${dayjs().format('YYYY年MM月')}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '卡片视图' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '周期筛选' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '直属下级' }));
    expect(container.querySelector('.okr-target-empty')).not.toBeInTheDocument();
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
});
