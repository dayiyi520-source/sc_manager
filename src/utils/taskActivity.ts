import type { RequirementEvent } from '../types';

const labels: Record<string, string> = { title: '标题', description: '任务描述', descriptionHtml: '任务描述', expectedGoal: '期望结果', priority: '优先级', assigneeName: '负责人', ownerName: '负责人', plannedStartDate: '计划开始时间', plannedEndDate: '计划完成时间', dueDate: '计划完成时间', expectedCompleteDate: '期望完成时间', estimatedHours: '预计工时', actualHours: '实际工时', versionId: '迭代版本', versionName: '迭代版本', customerId: '关联客户', customerName: '关联客户', ccNames: '参与人', media: '附件', status: '状态', severity: '严重程度', type: '缺陷类型', env: '所属环境', requirementType: '任务类型', specialFields: '扩展字段' };
export const normalizeTaskActivity = (raw: Record<string, unknown>): RequirementEvent => {
  let metadata = raw.metadata || raw.content || {};
  if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch { metadata = { content: metadata }; } }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) metadata = {};
  return { id: String(raw.id), eventType: String(raw.eventType), operatorName: String(raw.operatorName || raw.operatorId || '系统'), createdAt: String(raw.createdAt || ''), metadata: metadata as Record<string, unknown>, fromStatus: String(raw.fromStatus || ''), toStatus: String(raw.toStatus || '') };
};
const value = (input: unknown) => {
  const text = Array.isArray(input) ? input.join('、') : typeof input === 'object' && input !== null ? JSON.stringify(input) : String(input ?? '');
  const readable = ({ P0: '紧急', P1: '高', P2: '中', P3: '低' } as Record<string, string>)[text] || text;
  return readable || '未设置';
};
export const taskActivitySummary = (event: RequirementEvent): string => {
  const metadata = event.metadata || {};
  if (event.eventType === 'WORK_ITEM_REVIEWED') return `保存了复盘总结“${String((metadata.review as { title?: string })?.title || '')}”`;
  if (event.eventType === 'WORK_ITEM_CREATED') return '创建了任务';
  if (['WORK_ITEM_COMMENTED', '评论'].includes(event.eventType)) return '发表了评论';
  if (event.eventType === 'WORK_ITEM_TRANSITIONED') return `将状态从“${value(metadata.fromName || metadata.from)}”变更为“${value(metadata.toName || metadata.to)}”${metadata.actualHours != null && metadata.actualHours !== '' ? `，填写完成工时 ${value(metadata.actualHours)} 小时` : ''}`;
  if (event.eventType === 'WORK_ITEM_UPDATED' && Array.isArray(metadata.changes)) return metadata.changes.map((change: { field: string; from: unknown; to: unknown }) => `将${labels[change.field] || change.field}从“${value(change.from)}”修改为“${value(change.to)}”`).join('；');
  if (event.eventType === 'WORK_ITEM_UPDATED') return '修改了任务';
  if (event.eventType === '变更状态') return `将状态从“${value(event.fromStatus)}”变更为“${value(event.toStatus)}”`;
  if (event.eventType === '提需求') return '提交了需求';
  if (event.eventType.startsWith('修改') || event.eventType === '变更负责人') return `${event.eventType}：从“${value(metadata.from)}”变更为“${value(metadata.to)}”`;
  return event.eventType;
};
