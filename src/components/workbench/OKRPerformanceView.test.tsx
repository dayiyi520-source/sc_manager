// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
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

const okrState = {
  records: [objectiveRecord],
  okrs: [okr],
  performances: [],
  people: [
    { id: 'boss', name: '老板', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
    { id: 'manager', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  ],
  work: [],
  actionParents: [actionParent],
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
};

vi.mock('./okr/useOriginalOkr', () => ({ useOriginalOkr: () => okrState }));
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ currentUser: { id: 'boss', name: '老板', department: '管理层' }, addToast: vi.fn() }),
  useAppNavigationContext: () => ({ openPageTab: vi.fn() }),
}));

import { appendDemoBreakdown, filterVisibleDemoBreakdowns, includeSelectedCycle, OKRPerformanceView } from './OKRPerformanceView';

describe('OKRPerformanceView target navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    okrState.records = [objectiveRecord];
    okrState.okrs = [okr];
  });

  it('uses the new labels and clears detail or breakdown state when switching categories', async () => {
    const { container } = render(<OKRPerformanceView />);

    expect(screen.getByRole('tab', { name: /月度目标/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '我的目标' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /拆解目标/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看月度详情' }));
    expect(await screen.findByRole('region', { name: '目标逐级承接关系' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '直属上级目标' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: '目标逐级承接关系' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /拆解目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page[aria-label="拆解目标"]')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: '直属下级目标' }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page[aria-label="拆解目标"]')).not.toBeInTheDocument());
  });

  it('keeps target creation and action breakdown editors mutually exclusive', async () => {
    const { container } = render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: /拆解目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /添加目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page')).not.toBeInTheDocument());
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /拆解目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-objective-form-stack')).not.toBeInTheDocument());
    expect(container.querySelector('.okr-action-breakdown-page')).toBeInTheDocument();
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
    for (const category of ['supervisor', 'subordinate', 'department', 'other_dept'] as const) {
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

  it('opens every objective in the shared monthly detail context instead of a standalone draft form', async () => {
    okrState.records = [objectiveRecord, ...draftRecords];
    okrState.okrs = [okr, ...draftOkrs];

    render(<OKRPerformanceView />);
    const draftTarget = screen.getByLabelText('目标：草稿目标一');
    fireEvent.click(within(draftTarget).getByRole('button', { name: '查看月度详情' }));

    const monthlyDetail = await screen.findByRole('region', { name: '目标逐级承接关系' });
    expect(within(monthlyDetail).getAllByText('提升年度经营质量').length).toBeGreaterThan(0);
    expect(within(monthlyDetail).getAllByText('草稿目标一').length).toBeGreaterThan(0);
    expect(within(monthlyDetail).getAllByText('草稿目标二').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('目标名称')).not.toBeInTheDocument();
  });

  it('isolates personal active targets and drafts from every non-personal category', () => {
    okrState.records = [objectiveRecord, ...draftRecords];
    okrState.okrs = [okr, ...draftOkrs];

    render(<OKRPerformanceView />);
    expect(screen.getByLabelText('目标：草稿目标一')).toBeInTheDocument();

    for (const category of ['直属上级目标', '直属下级目标', '我部门的目标', '跨部门协同目标']) {
      fireEvent.click(screen.getByRole('tab', { name: category }));
      expect(screen.queryByText('提升年度经营质量')).not.toBeInTheDocument();
      expect(screen.queryByText('草稿目标一')).not.toBeInTheDocument();
      expect(screen.queryByText('草稿目标二')).not.toBeInTheDocument();
    }
  });
});
