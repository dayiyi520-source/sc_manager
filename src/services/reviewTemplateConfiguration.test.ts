import { describe, expect, it } from 'vitest';
import type { OkrPerson, OkrSettings } from './okrRepository';
import { activateReviewTemplate, bindReviewTemplate, matchReviewTemplate, newReviewTemplate, reviewTemplateErrors, validateReviewTemplates, type ReviewReportTemplate } from './reviewTemplateConfiguration';
const template = (patch: Partial<ReviewReportTemplate> = {}): ReviewReportTemplate => ({ ...newReviewTemplate(), id: 't', name: '研发周报', effectiveFrom: '2099-01-01', status: 'published', ...patch });
const settings = (rows: ReviewReportTemplate[]) => ({ reviewReportTemplates: rows } as OkrSettings);
const owner: OkrPerson = { id: 'e', name: '员工', department: '研发', rootFlag: 0, goalRole: 'employee', supervisorId: 'm', version: 0 };
describe('review template configuration', () => {
  it('matches published department, role, report type and report start; department overrides generic', () => {
    const generic = template(); const exact = template({ id: 'exact', department: '研发', effectiveFrom: '2099-01-02' });
    const next = template({ id: 'next', department: '研发', version: 2, effectiveFrom: '2099-02-01' });
    const config = settings([generic, exact, next, template({ id: 'draft', status: 'draft', effectiveFrom: '2099-01-03' }), template({ id: 'supervisor', audience: 'supervisor' })]);
    expect(matchReviewTemplate(config, '研发', 'employee', 'week', '2099-01-15')?.id).toBe('exact');
    expect(matchReviewTemplate(config, '研发', 'employee', 'week', '2099-02-01')?.id).toBe('next');
    expect(matchReviewTemplate(config, '销售', 'employee', 'week', '2099-02-01')?.id).toBe('t');
    expect(matchReviewTemplate(config, '研发', 'employee', 'month', '2099-01-15')).toBeUndefined();
    expect(matchReviewTemplate(config, '研发', 'employee', 'week', '2098-12-31')).toBeUndefined();
  });
  it('locks published versions, fixed blocks, duplicate dates and version collisions', () => {
    const row = template();
    expect(validateReviewTemplates([row])).toBeUndefined();
    expect(validateReviewTemplates([], [row])).toContain('已发布');
    expect(validateReviewTemplates([{ ...row, name: '篡改' }], [row])).toContain('已发布');
    expect(validateReviewTemplates([{ ...row, blocks: row.blocks.slice(1) }])).toContain('固定板块');
    expect(validateReviewTemplates([row, { ...row, id: 'other', version: 2 }])).toContain('只能启用一个');
    expect(validateReviewTemplates([{ ...row, reportType: 'month', effectiveFrom: '2099-02-02' }])).toContain('每月1日');
    expect(validateReviewTemplates([{ ...row, effectiveFrom: '2020-01-01' }])).toContain('不能早于');
  });
  it('validates required values only on submission but validates provided values in drafts', () => {
    const row = template(); row.blocks[0].fields = [
      { id: 'risk', label: '风险', type: 'text', required: true }, { id: 'rate', label: '比例', type: 'percentage', required: false },
      { id: 'flag', label: '是否', type: 'boolean', required: true }, { id: 'url', label: '链接', type: 'link', required: false },
      { id: 'choice', label: '状态', type: 'select', required: false, options: ['正常'] },
      { id: 'table', label: '明细', type: 'table', required: true, columns: ['成果'] },
    ];
    expect(reviewTemplateErrors(row, {}, false)).toEqual([]);
    expect(reviewTemplateErrors(row, {})).toHaveLength(3);
    expect(reviewTemplateErrors(row, { risk: '风险说明', flag: false, table: [{ 成果: '已交付' }] })).toEqual([]);
    expect(reviewTemplateErrors(row, { rate: 101, url: 'javascript:alert(1)', choice: '伪造' }, false)).toHaveLength(3);
    expect(reviewTemplateErrors(row, { risk: 'x', flag: false, table: [{ 成果: '' }] })).toEqual(['明细格式无效']);
  });
  it('binds snapshots, rejects stale forms and keeps saved/legacy reports stable after configuration changes', () => {
    const row = template(); row.blocks[0].fields = [{ id: 'risk', label: '风险', type: 'text', required: true }];
    const payload = { title: '周报', startDate: '2099-01-01', reviewType: 'week' as const, reviewTemplateSnapshot: row, reviewTemplateValues: {} };
    const draft = bindReviewTemplate(payload, settings([row]), owner, [owner], false);
    expect(draft.reviewTemplateSnapshot).toEqual(row);
    expect(() => bindReviewTemplate(payload, settings([row]), owner, [owner], true)).toThrow('风险');
    expect(() => bindReviewTemplate({ ...payload, reviewTemplateSnapshot: null }, settings([row]), owner, [owner], false)).toThrow('已变化');
    const saved = bindReviewTemplate({ ...payload, reviewTemplateSnapshot: null, reviewTemplateValues: { risk: '已排期', unknown: 'drop' } }, settings([]), { ...owner, department: '销售' }, [owner], true, draft);
    expect(saved.reviewTemplateSnapshot).toEqual(row);
    expect(saved.reviewTemplateValues).toEqual({ risk: '已排期' });
    expect(bindReviewTemplate(payload, settings([row]), owner, [owner], false, { title: '旧草稿' }).reviewTemplateSnapshot).toBeNull();
  });
});

it('switches one scope, excludes ended templates, and allows deletion only after stopping', () => {
  const old = template({ enabled: true });
  const otherDepartment = template({ id: 'sales', department: '销售' });
  const next = template({ id: 'v2', version: 2 });
  const rows = activateReviewTemplate([old, otherDepartment], next);
  expect(rows.find(row => row.id === old.id)?.enabled).toBe(false);
  expect(rows.find(row => row.id === otherDepartment.id)?.enabled).not.toBe(false);
  expect(validateReviewTemplates(rows, [old, otherDepartment])).toBeUndefined();
  expect(matchReviewTemplate(settings(rows), '研发', 'employee', 'week', '2099-01-15')?.id).toBe('v2');
  const ended = rows.map(row => row.id === next.id ? { ...row, enabled: false } : row);
  expect(matchReviewTemplate(settings(ended), '研发', 'employee', 'week', '2099-01-15')).toBeUndefined();
  expect(validateReviewTemplates(rows.filter(row => row.id !== next.id), rows)).toContain('先停用');
  expect(validateReviewTemplates(ended.filter(row => row.id !== next.id), ended)).toBeUndefined();
  expect(validateReviewTemplates(ended.map(row => row.id === old.id ? { ...row, name: '改写' } : row), ended)).toContain('内容不能修改');
});

it('ignores the legacy cycle audience override when binding a new report', () => {
  const row = template();
  const config = { ...settings([row]), weeklyReviewCycles: [{ id: 'w', template: 'supervisor', startDate: '2099-01-01', endDate: '2099-01-07' }] } as OkrSettings;
  expect(bindReviewTemplate({ title: '周报', reviewType: 'week', startDate: '2099-01-01', endDate: '2099-01-07', reviewTemplateSnapshot: row }, config, owner, [owner], false).reviewTemplateSnapshot).toEqual(row);
});

it('allows renamed and reordered fixed cards but keeps goals first and validates text limits', async () => {
  const { moveReviewBlock } = await import('./reviewTemplateConfiguration');
  const row = template();
  row.blocks[1].title = '本期任务';
  row.blocks = moveReviewBlock(row.blocks, 'knowledge', 'extra');
  expect(row.blocks.map(block => block.id)).toEqual(['goals', 'knowledge', 'extra', 'assistance']);
  expect(validateReviewTemplates([row])).toBeUndefined();
  expect(moveReviewBlock(row.blocks, 'knowledge', 'goals')).toBe(row.blocks);
  expect(moveReviewBlock(row.blocks, 'goals', 'knowledge')).toBe(row.blocks);
  expect(validateReviewTemplates([{ ...row, blocks: [...row.blocks.slice(1), row.blocks[0]] }])).toContain('第一位');
  row.blocks.push({ id: 'summary', title: '经验', guidance: '', fields: [{ id: 'answer', type: 'textarea', label: '经验', required: true, maxLength: 5 }] });
  expect(reviewTemplateErrors(row, {}, false)).toEqual([]);
  expect(reviewTemplateErrors(row, {})).toEqual(['请填写经验']);
  expect(reviewTemplateErrors(row, { answer: '123456' }, false)).toEqual(['经验格式无效']);
  expect(reviewTemplateErrors(row, { answer: '12345' })).toEqual([]);
});
