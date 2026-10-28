import { isRecordOnlyCollaboration, isCollaborationCreator, lastCollaborationProcessor } from '../utils/collaborationWorkflow';
import type { EmployeeOption, RequirementTask, RequirementWorkItem } from '../types';

type Item = RequirementTask & { workItems?: RequirementWorkItem[]; assigneeName?: string; deleted?: boolean; deleteFlag?: boolean };
type Context = { items: Item[]; people: EmployeeOption[]; viewer?: { id?: string; name?: string }; now: string; eventId: string };
const editable = ['title', 'description', 'descriptionHtml', 'media', 'productLineId', 'productLineName', 'customerId', 'customerName', 'priority', 'workOrderType', 'specialFields', 'expectedCompleteDate', 'dueDate'] as const;
export function applyCollaborationWorkflow(action: 'close' | 'reopen' | 'acceptance-failed', id: string, body: Record<string, any>, context: Context): Item {
  const current = context.items.find(item => item.id === id && !item.deleted && !item.deleteFlag);
  if (!current || current.category && current.category !== 'requirement') throw new Error('事项不存在');
  if (!context.viewer || !isCollaborationCreator(current, context.viewer)) throw new Error('仅事项创建人可执行此操作');
  const revision = current.revision ?? current.version ?? 0;
  if (body.revision !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
  if (action === 'close' && current.status !== '已退回') throw new Error('仅已退回事项可以关闭');
  if (action === 'reopen' && !['已完成', '已关闭', '已退回'].includes(current.status)) throw new Error('仅已完成、已关闭或已退回事项可以重新发起');
  if (action === 'acceptance-failed' && current.status !== '待验收') throw new Error('仅待验收事项可以验收未通过');
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 2000) throw new Error('原因不能超过2000字');
  if ((action === 'acceptance-failed' || action === 'reopen' && ['已完成', '已关闭'].includes(current.status)) && !reason) throw new Error(action === 'reopen' ? '请填写重新开启原因' : '请填写验收未通过原因');
  let changes: Partial<Item> = {};
  let feedback: Record<string, unknown> = {};
  let owner: EmployeeOption | undefined;
  if (action === 'reopen') {
    owner = context.people.find(person => person.id === body.assigneeId);
    if (!owner) throw new Error('请选择有效负责人');
    const input = body.changes || {};
    changes = Object.fromEntries(editable.filter(field => Object.prototype.hasOwnProperty.call(input, field)).map(field => [field, input[field]]));
    const candidate = { ...current, ...changes };
    if (!candidate.title?.trim() || !candidate.description?.trim() || (!isRecordOnlyCollaboration(candidate) && !(candidate.expectedCompleteDate || candidate.dueDate))) throw new Error('请补充标题、事项描述和期望完成时间');
    if (candidate.workOrderType !== '其他问题' && !candidate.productLineId) throw new Error('请选择所属产品');
    const demand = typeof candidate.specialFields === 'string' ? JSON.parse(candidate.specialFields) : candidate.specialFields || {};
    if (candidate.workOrderType === '客户诉求' && demand.transferToProduct !== '不需要' && !String(demand.productDescription || '').trim()) throw new Error('请填写产品需求描述');
    const special = candidate.specialFields && typeof candidate.specialFields === 'object' ? candidate.specialFields : {};
    if (candidate.workOrderType === '售前支持' && (!special.opportunityId || !special.supportType)) throw new Error('请完成商机及支持类型');
    if (['客户诉求', '线上问题', '交付支持'].includes(candidate.workOrderType || '') && !special.projectName) throw new Error('请选择所属项目');
    if (candidate.workOrderType === '客户诉求' && !special.requestSource) throw new Error('请填写诉求来源');
    if (candidate.workOrderType === '其他问题' && !special.problemType) throw new Error('请选择协助类型');
    changes.title = candidate.title.trim();
    changes.progress = 0;
  }
  if (action === 'acceptance-failed') {
    const processor = lastCollaborationProcessor(current, context.people);
    owner = context.people.find(person => person.id === (processor.resolved ? processor.id : body.taskOwnerId));
    if (!owner) throw new Error('原处理负责人失效或无法识别，请选择有效负责人');
    if (processor.resolved && body.taskOwnerId && body.taskOwnerId !== processor.id) throw new Error('请使用上一次实际处理事项的负责人');
    if (body.workItemId) {
      const direct = current.workItems?.find(item => item.id === body.workItemId || (item as RequirementWorkItem & { taskId?: string }).taskId === body.workItemId);
      const linked = context.items.find(item => item.id === body.workItemId && item.id !== current.id && !item.deleted && !item.deleteFlag && (item.sourceWorkOrderIds?.includes(current.id) || item.requirementId === current.id || item.relatedTaskIds?.some(parentId => context.items.some(parent => parent.id === parentId && (parent.sourceWorkOrderIds?.includes(current.id) || parent.requirementId === current.id)))));
      const task = direct || linked;
      if (!task) throw new Error('反馈任务不属于当前事项或已失效');
      const code = (task as { code?: string }).code || context.items.find(item => item.id === ('taskId' in task ? task.taskId : task.id))?.code || '';
      feedback = { workItemId: task.id, taskCode: code, taskTitle: task.title, failedTask: { id: task.id, code, title: task.title }, feedbackReason: reason };
    }
  }
  const status = action === 'close' ? '已关闭' : action === 'reopen' ? '待处理' : '处理中';
  const eventType = action === 'close' ? '事项关闭' : action === 'reopen' ? ['已完成', '已关闭'].includes(current.status) ? '事项重开' : '重新发起' : '验收未通过';
  const updated = { ...current, ...changes, status, ...(owner ? { ownerName: owner.name, assigneeName: owner.name, assigneeId: owner.id, department: owner.department } : {}), revision: revision + 1 };
  updated.events = [...(current.events || []), { id: context.eventId, eventType, fromStatus: current.status, toStatus: status, operatorName: context.viewer?.name || current.creatorName || '', reason, createdAt: context.now, metadata: { ...feedback, ...(owner ? { ownerChanged: current.assigneeId !== owner.id, fromAssigneeName: current.ownerName, assigneeName: owner.name, assigneeId: owner.id } : {}), ...(action === 'close' ? { completionType: 'CREATOR_CLOSED' } : {}), ...(action === 'reopen' ? { editedFields: Object.keys(changes).filter(field => field !== 'progress') } : {}), attachmentIds: Array.isArray(body.attachmentIds) ? body.attachmentIds : [] } }];
  return updated;
}
