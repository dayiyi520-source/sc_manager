import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const testPlanSource = readFileSync(new URL('./TestPlanPanel.tsx', import.meta.url), 'utf8');

describe('test plan create form contract', () => {
  it('uses the required environment choices and a localized date range', () => {
    expect(testPlanSource).toContain('options={[\'测试环境\', \'线上环境\']');
    expect(testPlanSource).toContain('placeholder="请选择测试环境"');
    expect(testPlanSource).not.toContain("environment: ''");
    expect(testPlanSource).toContain('locale={zhCN.DatePicker}');
    expect(testPlanSource).toContain("placeholder={['开始日期', '结束日期']}");
  });
});
