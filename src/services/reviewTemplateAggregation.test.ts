import { expect, it } from 'vitest';
import type { OkrPayload, OkrPerson, OkrRecord } from './okrRepository';
import { newReviewTemplate, configurableReviewTemplate, parseJudgmentOptions, reviewTemplateErrors, validateReviewTemplates, bindReviewTemplate } from './reviewTemplateConfiguration';
import { reviewTemplateAggregations } from './reviewTemplateAggregation';
import { validateReviewProgress, syncSubmittedReviewProgress } from './okrReviewProgressSync';

const people: OkrPerson[] = [
  { id: 'm', name: '主管', department: '研发', supervisorId: '', goalRole: 'supervisor', rootFlag: 0, version: 0 },
  { id: 'e', name: '员工', department: '研发', supervisorId: 'm', goalRole: 'employee', rootFlag: 0, version: 0 },
  { id: 'x', name: '其他部门', department: '销售', supervisorId: '', goalRole: 'employee', rootFlag: 0, version: 0 },
];
const source = () => ({ ...newReviewTemplate(), id: 'source', name: '员工模板', department: '研发', effectiveFrom: '2099-01-01', status: 'published' as const, blocks: [...newReviewTemplate().blocks, { id: 'ideas', title: '改进建议', guidance: '', departmentLink: { reportType: 'week' as const }, fields: [{ id: 'text', label: '建议', type: 'textarea' as const, required: true }] }] });
const target = () => ({ ...newReviewTemplate(), id: 'target', name: '主管模板', department: '研发', audience: 'supervisor' as const, effectiveFrom: '2099-01-01', status: 'published' as const, blocks: [...newReviewTemplate().blocks, { id: 'summary', title: '员工意见汇总', guidance: '', fields: [], aggregation: { sourceBlockId: 'ideas', sourceReportType: 'week' as const, needsJudgment: true, judgmentLabel: '采纳情况', judgmentOptions: ['采纳', '待评估'] } }] });
const period = { reviewType: 'week' as const, startDate: '2099-01-01', endDate: '2099-01-07' };
const payload = (): OkrPayload => ({ title: '主管周报', ...period, reviewMode: 'supervisor', reviewTemplateSnapshot: target() });
const report = (patch: Partial<OkrRecord> = {}): OkrRecord => ({ id: 'r', ownerId: 'e', kind: 'review', version: 0, periodKey: '', status: 'submitted', payload: { title: '员工周报', ...period, reviewTemplateSnapshot: source(), reviewTemplateValues: { text: '  优化交付流程  ' } }, ...patch });

it('parses both comma styles, trims empty entries and rejects duplicate judgment choices', () => {
  expect(parseJudgmentOptions(' 采纳 , 待评估，， 无需处理, ')).toEqual(['采纳', '待评估', '无需处理']);
  const row = target();
  expect(validateReviewTemplates([source(), row])).toBeUndefined();
  row.blocks.at(-1)!.aggregation!.judgmentOptions = ['采纳'];
  expect(validateReviewTemplates([source(), row])).toBeUndefined();
  row.blocks.at(-1)!.aggregation!.judgmentOptions = parseJudgmentOptions('采纳，采纳');
  expect(validateReviewTemplates([source(), row])).toContain('不重复');
  row.blocks.at(-1)!.aggregation!.judgmentOptions = [];
  expect(validateReviewTemplates([source(), row])).toContain('判断名称');
});
it('requires a published, visible same-period source on publishing, while preserving published versions', () => {
  const src = source();
  src.blocks.at(-1)!.visible = false;
  expect(validateReviewTemplates([src, target()])).toContain('汇总来源');
  expect(validateReviewTemplates([src, target()], [src, target()])).toBeUndefined();
  src.blocks.at(-1)!.visible = true;
  src.blocks.at(-1)!.departmentLink = { reportType: 'month' } as never;
  expect(validateReviewTemplates([src, target()])).toContain('同类型');
});
it('aggregates only nonempty submitted employee sources in the same department and period', () => {
  const current = report();
  const rows = [current, report({ id: 'draft', ownerId: 'x', status: 'draft' }), report({ id: 'other', ownerId: 'x' }), report({ id: 'old', payload: { ...current.payload, endDate: '2098-12-31' } })];
  expect(reviewTemplateAggregations(payload(), rows, people, 'm')).toEqual({ summary: [{ employeeId: 'e', employeeName: '员工', reviewId: 'r', content: '优化交付流程', judgment: undefined }] });
  expect(reviewTemplateAggregations(payload(), rows, people, 'e')).toEqual({});
  current.payload.reviewTemplateSnapshot!.blocks.at(-1)!.visible = false;
  expect(reviewTemplateAggregations(payload(), [current], people, 'm')).toEqual({ summary: [] });
  current.payload.reviewTemplateSnapshot!.blocks.at(-1)!.visible = true;
  current.payload.reviewTemplateValues = { text: '  ' };
  expect(reviewTemplateAggregations(payload(), [current], people, 'm')).toEqual({ summary: [] });
});
it('retains valid judgments only for unchanged source content and enforces them on submit', () => {
  const current = report();
  const next = payload();
  next.reviewTemplateAggregations = reviewTemplateAggregations(next, [current], people, 'm');
  expect(() => reviewTemplateAggregations(next, [current], people, 'm', true)).toThrow('采纳情况');
  next.reviewTemplateAggregations.summary[0].judgment = '采纳';
  expect(reviewTemplateAggregations(next, [current], people, 'm', true).summary[0].judgment).toBe('采纳');
  current.payload.reviewTemplateValues = { text: '新内容' };
  expect(() => reviewTemplateAggregations(next, [current], people, 'm', true)).toThrow('采纳情况');
  next.reviewTemplateSnapshot!.blocks.at(-1)!.aggregation!.needsJudgment = false;
  expect(reviewTemplateAggregations(next, [current], people, 'm', true).summary[0].judgment).toBeUndefined();
  next.reviewTemplateSnapshot!.blocks.at(-1)!.visible = false;
  expect(reviewTemplateAggregations(next, [current], people, 'm', true)).toEqual({});
});
it('separates multiple employee fields with actual line breaks', () => {
  const current = report();
  current.payload.reviewTemplateSnapshot!.blocks.at(-1)!.fields.push({ id: 'details', label: '补充', type: 'textarea', required: false });
  current.payload.reviewTemplateValues!.details = '先试点再推广';
  expect(reviewTemplateAggregations(payload(), [current], people, 'm').summary[0].content).toBe('优化交付流程\n先试点再推广');
});
it('hidden fixed blocks skip validation and sync, preserve old content and reject edits to hidden values', () => {
  const snapshot = source();
  snapshot.blocks.forEach(block => { block.visible = false; });
  const next: OkrPayload = { title: '员工周报', ...period, reviewTemplateSnapshot: snapshot, reviewTemplateValues: { text: '尝试改写' }, krReviews: [{ objectiveId: 'missing' } as never], knowledgeEntries: [{} as never] };
  expect(reviewTemplateErrors(snapshot, {})).toEqual([]);
  const saved = bindReviewTemplate(next, { reviewReportTemplates: [snapshot] } as never, people[1], people, true);
  expect(saved.krReviews).toEqual([]);
  expect(saved.knowledgeEntries).toEqual([]);
  expect(saved.reviewTemplateValues).toEqual({});
  const previous = { ...saved, reviewTemplateValues: { text: '原内容' }, krReviews: next.krReviews };
  const edited = bindReviewTemplate(next, {} as never, people[1], people, true, previous);
  expect(edited.reviewTemplateValues).toEqual({ text: '原内容' });
  expect(edited.krReviews).toEqual(previous.krReviews);
  expect(() => validateReviewProgress(edited, 'e', [], people)).not.toThrow();
  const records = [report({ payload: edited })];
  expect(syncSubmittedReviewProgress(records, records[0], people)).toBe(records);
});
it('copies old defaults into configurable modules without changing existing templates', () => {
  const old = { ...source(), configurationVersion: undefined, reportType: 'month' as const, blocks: newReviewTemplate().blocks };
  const upgraded = configurableReviewTemplate(old);
  expect(upgraded.blocks.at(-1)).toMatchObject({ id: 'suggestions', departmentLink: { reportType: 'month' } });
  expect(old.blocks).toHaveLength(4);
  expect(configurableReviewTemplate({ ...old, audience: 'supervisor' }).blocks.at(-1)?.aggregation).toMatchObject({ sourceBlockId: 'suggestions', needsJudgment: true });
});
