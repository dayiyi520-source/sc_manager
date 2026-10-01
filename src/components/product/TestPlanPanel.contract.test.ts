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

  it('refreshes execution status when the shared round signal changes', () => {
    expect(testPlanSource).toContain("refreshKey?: number");
    expect(testPlanSource).toContain("queryKey: ['test-executions', workItemId, refreshKey]");
  });

  it('keeps the revised create-plan entry and localized actions', () => {
    expect(testPlanSource).toContain('>新建</Button>');
    expect(testPlanSource).toContain('okText="保存"');
    expect(testPlanSource).toContain('cancelText="取消"');
    expect(testPlanSource).toContain('width="min(640px, calc(100vw - 32px))"');
    expect(testPlanSource).toContain("maxHeight: 'calc(100vh - 220px)'");
  });

  it('puts the task association directly after the plan name and allows clearing associations', () => {
    const nameIndex = testPlanSource.indexOf('name="name" label="计划名称"');
    const taskIndex = testPlanSource.indexOf('name="workItemId" label="关联测试任务"');
    const environmentIndex = testPlanSource.indexOf('name="environment" label="测试环境"');
    expect(nameIndex).toBeGreaterThan(-1);
    expect(taskIndex).toBeGreaterThan(nameIndex);
    expect(taskIndex).toBeLessThan(environmentIndex);
    expect(testPlanSource).toContain('name="workItemId" label="关联测试任务" rules={[{ required: true, message: \'请选择关联测试任务\' }]}><Select showSearch allowClear');
    expect(testPlanSource).toContain('name="ownerId" label="负责人"');
    expect(testPlanSource).toContain('name="productLineId" label="关联产品"');
    expect(testPlanSource).toContain('name="versionId" label="关联迭代"');
    expect((testPlanSource.match(/showSearch allowClear/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it('selecting a task backfills product, iteration, and owner while remaining editable', () => {
    expect(testPlanSource).toContain('productLineId: selected?.productLineId');
    expect(testPlanSource).toContain('versionId: selected?.versionId || undefined');
    expect(testPlanSource).toContain("ownerId: employeeOptions.find((employee) => employee.name === selected?.assigneeName)?.id");
    expect(testPlanSource).toContain('setFieldsValue({ workItemId: value');
  });
});
