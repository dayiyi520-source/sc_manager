// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { ConfigProvider, Modal } from 'antd';
import { ReviewTemplateSettings } from './ReviewTemplateSettings';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';
import { type ReviewReportTemplate, type ReviewTemplateBlock, newReviewTemplate } from '../../../services/reviewTemplateConfiguration';
import type { OkrPayload, OkrPerson, OkrRecord, OkrSettings } from '../../../services/okrRepository';
import { createReviewCopyDraft } from './reviewCopy';
import seed from '../../../data/mockOkrState.json';
beforeAll(() => ConfigProvider.config({ holderRender: children => <ConfigProvider theme={{ token: { motion: false } }}>{children}</ConfigProvider> }));
afterAll(() => ConfigProvider.config({ holderRender: undefined }));
afterEach(async () => {
  cleanup();
  await act(async () => { Modal.destroyAll(); });
  await waitFor(() => expect(document.querySelector('.ant-modal-root')).toBeNull());
});
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof IntersectionObserver;
const row = { ...newReviewTemplate(), id: 't', name: '研发总结', effectiveFrom: '2099-01-01' };
const configured = (): ReviewReportTemplate => ({ ...structuredClone(row), status: 'published' as const, blocks: row.blocks.map<ReviewTemplateBlock>((block, index) => ({ ...block, fields: index === 0 ? [{ id: 'risk', label: '风险说明', type: 'textarea' as const, required: true }] : [] })).concat([{ id: 'quality', title: '质量分析', guidance: '说明本期质量情况', fields: [{ id: 'score', label: '质量分', type: 'number' as const, required: false }] }]) });
it('preserves draft input after a failed save and closes only after successful save', async () => {
  const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<ConfigProvider theme={{ token: { motion: false } }}><ReviewTemplateSettings rows={[row]} people={[]} departments={['研发']} onSave={onSave}/></ConfigProvider>);
  fireEvent.click(screen.getByRole('button', { name: /更多操作/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: '编辑' }));
  const dialog = await screen.findByRole('region', { name: '配置复盘总结模板' });
  expect(screen.getByRole('dialog')).toHaveStyle({ width: '100%', top: '0px' });
  expect(screen.queryByText('固定四个板块，按部门配置扩展内容')).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByRole('textbox', { name: '模板名称' }), { target: { value: '新版研发总结' } });
  fireEvent.click(within(dialog).getByRole('tab', { name: '模块配置' }));
  expect(within(dialog).queryByRole('button', { name: '删除板块' })).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '增加扩展板块' }));
  expect(within(dialog).getByRole('textbox', { name: '扩展板块名称' })).toHaveValue('新板块');
  fireEvent.click(within(dialog).getByRole('button', { name: /保存草稿/ }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  fireEvent.click(within(dialog).getByRole('tab', { name: '基础信息' }));
  expect(within(dialog).getByRole('textbox', { name: '模板名称' })).toHaveValue('新版研发总结');
  await waitFor(() => expect(screen.getByRole('button', { name: /保存草稿/ })).not.toHaveClass('ant-btn-loading'));
  await waitFor(() => expect(within(screen.getByRole('region', { name: '配置复盘总结模板' })).getByRole('button', { name: /预\s*览/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('textbox', { name: '模板名称' })).not.toBeInTheDocument());
});
it('ongoing templates expose stop, preview and copy, with deletion locked until stopped', async () => {
  render(<ReviewTemplateSettings rows={[{ ...row, status: 'published' }]} people={[]} departments={[]} onSave={vi.fn()}/>);
  expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
  expect(screen.queryByText('待生效')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '预览' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /更多操作/ }));
  expect(await screen.findByRole('menuitem', { name: /^删除$/ })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('menuitem', { name: '停用' })).not.toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('menuitem', { name: '预览' })).toBeInTheDocument();
  expect(screen.getByText('进行中')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '复制新版本' }));
  const version = within(await screen.findByRole('region', { name: '配置复盘总结模板' })).getByRole('textbox', { name: '版本' });
  expect(version).toHaveValue('V2');
  expect(version).toBeDisabled();
});
it('enables an ended version and stops the other active version on confirmed save', async () => {
  const old = { ...row, status: 'published' as const, enabled: true };
  const ended = { ...old, id: 'v2', name: '新版', version: 2, enabled: false };
  const save = vi.fn().mockResolvedValue(true);
  render(<ReviewTemplateSettings rows={[old, ended]} people={[]} departments={[]} onSave={save}/>);
  expect(screen.getByText('已结束')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '更多操作：新版 V2' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /^启用$/ }));
  const confirm = await screen.findByRole('dialog');
  fireEvent.click(within(confirm).getByRole('button', { name: /OK|确\s*定/ }));
  await waitFor(() => expect(save).toHaveBeenCalledWith([expect.objectContaining({ id: 't', enabled: false }), expect.objectContaining({ id: 'v2', enabled: true })]));
});
const props = { okrs: [], work: [], records: [], currentUserId: 'e', busy: false, workLoading: false, onRefreshWork: vi.fn(), onSaveDraft: vi.fn(async (_payload: OkrPayload) => true), onSubmit: vi.fn(async () => true), onCancel: vi.fn(), viewer: { id: 'e', name: '员工', department: '研发' }, periodOverride: { startDate: '2099-01-01', endDate: '2099-01-07' } };
it.each([
  ['employee', 'week', 'nextWeekPlan', '下周计划'],
  ['employee', 'month', 'suggestions', '对公司或部门发展有帮助的意见和建议'],
  ['supervisor', 'week', 'departmentSummary', '部门补充总结'],
  ['supervisor', 'month', 'departmentSummary', '本月部门补充总结'],
] as const)('persists seeded %s %s text once in both template values and existing report fields', (audience, type, blockId, label) => {
  const template = { ...seed.okrSettings.reviewReportTemplates.find(row => row.audience === audience && row.reportType === type), enabled: true } as ReviewReportTemplate;
  expect(template).toMatchObject({ department: '产品规划部', version: 1, status: 'published' });
  const save = vi.fn(async (_payload: OkrPayload) => true);
  const Component = type === 'month' && audience === 'employee' ? MonthlyReviewEditor : WeeklyReviewEditor;
  render(<Component {...props} template={audience} reviewType={type} viewer={{ ...props.viewer, department: '产品规划部' }} reviewSettings={{ reviewReportTemplates: [template] } as OkrSettings} onSaveDraft={save}/>);
  expect(screen.getAllByRole('textbox', { name: label })).toHaveLength(1);
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: '保存后的内容' } });
  fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
  const field = template.blocks.find(block => block.id === blockId)!.fields[0];
  expect(save.mock.calls[0][0]).toMatchObject({ [blockId === 'departmentSummary' ? 'summary' : blockId]: '保存后的内容', reviewTemplateSnapshot: { id: template.id }, reviewTemplateValues: { [field.id]: '保存后的内容' } });
});
it('renders configured fields in weekly reports, saves values and blocks missing required submission', () => {
  const template = configured();
  const save = vi.fn(async (_payload: OkrPayload) => true);
  render(<WeeklyReviewEditor {...props} onSaveDraft={save} directSubmit reviewSettings={{ reviewReportTemplates: [template] } as OkrSettings}/>);
  expect(screen.getByRole('region', { name: '质量分析' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
  expect(screen.getByText('请填写风险说明')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: '风险说明' }), { target: { value: '依赖延期' } });
  fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
  expect(save.mock.calls[0][0]).toMatchObject({ reviewTemplateSnapshot: { id: 't' }, reviewTemplateValues: { risk: '依赖延期' } });
});
it('restores saved monthly template independently of current configuration and read-only mode disables fields', () => {
  const template = { ...configured(), reportType: 'month' as const };
  render(<MonthlyReviewEditor {...props} recordStatus="submitted" initialPayload={{ title: '月报', startDate: '2099-01-01', reviewTemplateSnapshot: template, reviewTemplateValues: { risk: '历史风险' } }}/>);
  expect(screen.getByRole('textbox', { name: '风险说明' })).toHaveValue('历史风险');
  expect(screen.getByRole('textbox', { name: '风险说明' })).toBeDisabled();
});
it('uses monthly templates for new employee and supervisor monthly reports', () => {
  for (const audience of ['employee', 'supervisor'] as const) {
    const template = { ...configured(), reportType: 'month' as const, audience };
    render(<MonthlyReviewEditor {...props} template={audience} reviewSettings={{ reviewReportTemplates: [template] } as OkrSettings}/>);
    expect(screen.getByRole('textbox', { name: '风险说明' })).toBeEnabled();
    expect(screen.getByRole('region', { name: '质量分析' })).toBeInTheDocument();
    cleanup();
  }
});
it('new-period copies drop old template and custom answers', () => {
  const source = { title: '旧报告', startDate: '2099-01-01', reviewTemplateSnapshot: configured(), reviewTemplateValues: { risk: '旧答案' } };
  expect(createReviewCopyDraft(source)).toMatchObject({ startDate: undefined, reviewTemplateSnapshot: undefined, reviewTemplateValues: undefined });
});

it('saves configured judgments and shows saved employee content in read-only reports', async () => {
  const employeeTemplate = configured();
  employeeTemplate.blocks.push({ id: 'ideas', title: '流程建议', guidance: '', fields: [{ id: 'idea-text', label: '建议', type: 'textarea', required: false }], departmentLink: { reportType: 'week' } });
  const managerTemplate = { ...configured(), audience: 'supervisor' as const };
  managerTemplate.blocks[0].fields = [];
  managerTemplate.blocks.push({ id: 'summary', title: '员工建议汇总', guidance: '', fields: [], aggregation: { sourceBlockId: 'ideas', sourceReportType: 'week', needsJudgment: true, judgmentLabel: '后续动作', judgmentOptions: ['安排试点', '继续观察'] } });
  const people: OkrPerson[] = [
    { id: 'm', name: '主管', department: '研发', supervisorId: '', rootFlag: 0, goalRole: 'supervisor', version: 0 },
    { id: 'e', name: '员工', department: '研发', supervisorId: 'm', rootFlag: 0, goalRole: 'employee', version: 0 },
  ];
  const records: OkrRecord[] = [{ id: 'employee-review', kind: 'review', ownerId: 'e', status: 'submitted', version: 0, periodKey: '2099-01-01', payload: { title: '员工周报', ...props.periodOverride, reviewType: 'week', reviewTemplateSnapshot: employeeTemplate, reviewTemplateValues: { 'idea-text': '先做小范围试点' } } }];
  const save = vi.fn(async (_payload: OkrPayload) => true);
  const managerProps = { ...props, people, records, currentUserId: 'm', viewer: people[0], template: 'supervisor' as const, onSaveDraft: save };
  const { rerender } = render(<WeeklyReviewEditor {...managerProps} recordStatus="draft" initialPayload={{ title: '部门周报', ...props.periodOverride, reviewType: 'week', reviewTemplateSnapshot: managerTemplate }}/>);
  expect(screen.getByText('先做小范围试点')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '员工的后续动作' }));
  fireEvent.click(await screen.findByText('安排试点', { selector: '.ant-select-item-option-content' }));
  fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
  const saved = save.mock.calls[0][0];
  expect(saved.reviewTemplateAggregations?.summary).toEqual([expect.objectContaining({ employeeId: 'e', content: '先做小范围试点', judgment: '安排试点' })]);
  rerender(<WeeklyReviewEditor {...managerProps} recordStatus="submitted" initialPayload={saved} records={records.map(record => ({ ...record, payload: { ...record.payload, reviewTemplateValues: { 'idea-text': '后来改为全面推广' } } }))}/>);
  expect(screen.getByText('先做小范围试点')).toBeInTheDocument();
  expect(screen.getByText('安排试点')).toBeInTheDocument();
  expect(screen.queryByText('后来改为全面推广')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: '员工的后续动作' })).not.toBeInTheDocument();
});

it.each(['week', 'month'] as const)('hides fixed and custom modules in %s reports without legacy fallback or required validation', async type => {
  const template = configured();
  template.reportType = type;
  template.blocks.forEach(block => { block.visible = false; });
  const Component = type === 'month' ? MonthlyReviewEditor : WeeklyReviewEditor;
  render(<Component {...props} directSubmit reviewSettings={{ reviewReportTemplates: [template] } as OkrSettings}/>);
  expect(document.querySelector('[data-review-block]')).toBeNull();
  expect(screen.queryByRole('textbox', { name: '风险说明' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '对公司或部门发展有帮助的意见和建议' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '下周计划' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: type === 'month' ? '提交月报' : '提交周报' }));
  expect(screen.queryByText('请填写风险说明')).not.toBeInTheDocument();
  expect(await screen.findByRole('dialog', { name: type === 'month' ? '提交月报确认' : '确认提交周报' })).toBeInTheDocument();
});

it('applies saved card order and renamed titles in weekly and monthly report DOM', () => {
  for (const type of ['week', 'month'] as const) {
    const template = configured();
    template.reportType = type;
    template.blocks = [template.blocks[0], template.blocks[3], template.blocks[4], template.blocks[1], template.blocks[2]];
    template.blocks[1].title = '本期经验';
    const Component = type === 'week' ? WeeklyReviewEditor : MonthlyReviewEditor;
    const { container } = render(<Component {...props} reviewSettings={{ reviewReportTemplates: [template] } as OkrSettings}/>);
    const sections = Array.from(container.querySelectorAll('section.okr-weekly-section')).filter(node => node.hasAttribute('data-review-block') || node.getAttribute('aria-label') === '质量分析');
    expect(sections.map(node => node.getAttribute('data-review-block') || node.getAttribute('aria-label'))).toEqual(['goals', 'knowledge', '质量分析', 'extra', 'assistance']);
    expect(screen.getByText('2. 本期经验')).toBeInTheDocument();
    cleanup();
  }
});
