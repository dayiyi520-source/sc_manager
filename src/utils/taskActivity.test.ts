import { describe, expect, it } from 'vitest';
import { normalizeTaskActivity, taskActivitySummary, formatTaskActivityTime } from './taskActivity';

describe('task activity display', () => {
  it('reads persisted JSON and explains field and priority changes', () => {
    const event = normalizeTaskActivity({ id: '1', eventType: 'WORK_ITEM_UPDATED', operatorName: '张三', content: JSON.stringify({ changes: [{ field: 'title', from: '旧名称', to: '新名称' }, { field: 'priority', from: 'P2', to: 'P1' }] }) });
    expect(event.operatorName).toBe('张三');
    expect(taskActivitySummary(event)).toBe('将标题从“旧名称”修改为“新名称”；将优先级从“中”修改为“高”');
  });
  it('shows creation, comments and state names and tolerates legacy records', () => {
    expect(taskActivitySummary(normalizeTaskActivity({ eventType: 'WORK_ITEM_CREATED' }))).toBe('创建了任务');
    expect(taskActivitySummary(normalizeTaskActivity({ eventType: 'WORK_ITEM_COMMENTED', content: { content: '已确认' } }))).toBe('发表了评论');
    expect(taskActivitySummary(normalizeTaskActivity({ eventType: 'WORK_ITEM_TRANSITIONED', content: { fromName: '处理中', toName: '已完成' } }))).toContain('从“处理中”变更为“已完成”');
    expect(taskActivitySummary(normalizeTaskActivity({ eventType: 'WORK_ITEM_UPDATED', content: 'invalid json' }))).toBe('修改了任务');
  });
});

 it('将本地补全事件和未知英文事件显示为中文，时间去除 ISO 标记与微秒', () => {
   expect(taskActivitySummary(normalizeTaskActivity({ eventType: 'LOCAL_DATA_ENRICHED' }))).toBe('补充了任务资料');
   expect(taskActivitySummary(normalizeTaskActivity({ eventType: 'UNKNOWN_EVENT' }))).toBe('更新了任务记录');
   expect(formatTaskActivityTime('2026-10-10T07:38:42.987123Z')).toMatch(/^2026-10-10 \d{2}:38:42$/);
   expect(formatTaskActivityTime('invalid')).toBe('—');
 });
