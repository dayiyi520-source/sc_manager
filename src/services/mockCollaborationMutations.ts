import type { RequirementTask, EmployeeOption } from '../types';
import { isCollaborationCreator } from '../utils/collaborationWorkflow';

type Item = RequirementTask & { workItems?: unknown[]; deleted?: boolean; deleteFlag?: number; pendingReassignment?: { id: string; assigneeId: string; assigneeName: string; reason: string; attachmentIds: string[] } };
type Context = { items: Item[]; people: EmployeeOption[]; viewer: { id: string; name: string }; save: (items: Item[]) => void; id: () => string; now: string };
const editable = ['title', 'description', 'descriptionHtml', 'media', 'productLineId', 'productLineName', 'customerId', 'customerName', 'priority', 'workOrderType', 'specialFields', 'expectedCompleteDate', 'dueDate', 'ccNames'] as const;

// Only explicit collaboration mutations are handled here; unknown routes must fail visibly.
export function mutateCollaboration(parts: string[], method: string, body: Record<string, any>, context: Context) {
  const { items, people, viewer, now } = context;
  const isCreate = parts.length === 2 && method === 'POST';
  const reassignmentAction = parts[2] === 'reassign' && ['accept', 'reject'].includes(parts[4]);
  const current = isCreate ? undefined : reassignmentAction
    ? items.find(item => item.pendingReassignment?.id === parts[3])
    : items.find(item => item.id === parts[2] && !item.deleted && !item.deleteFlag);
  if (!viewer.id) throw new Error('请登录后操作');
  if (!isCreate && !current) throw new Error('事项不存在或转派已处理');
  const owner = current && (current.assigneeId ? current.assigneeId === viewer.id : current.ownerName === viewer.name);
  const creator = current && isCollaborationCreator(current, viewer);
  const revision = Number(current?.revision ?? current?.version ?? 0);
  if (!isCreate && body.revision !== undefined && Number(body.revision) !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
  const reason = String(body.reason || '').trim();
  const event = (eventType: string, metadata: Record<string, unknown> = {}) => ({ id: context.id(), eventType, operatorName: viewer.name, createdAt: now, reason, metadata });
  const persist = (updated: Item) => {
    context.save(isCreate ? [updated, ...items] : items.map(item => item.id === updated.id ? updated : item));
    return updated;
  };
  if (isCreate || method === 'PUT' && parts.length === 3) {
    if (!isCreate && !creator && !owner) throw new Error('仅创建人或负责人可修改事项');
    const changes = Object.fromEntries(editable.filter(field => body[field] !== undefined).map(field => [field, body[field]]));
    const assignee = people.find(person => person.id === body.assigneeId || !body.assigneeId && person.name === body.ownerName);
    if (isCreate && !assignee) throw new Error('请选择有效负责人');
    const candidate = { ...current, ...changes } as Item;
    if (!candidate.title?.trim() || !candidate.description?.trim() || !(candidate.expectedCompleteDate || candidate.dueDate)) throw new Error('请补充标题、事项描述和期望完成时间');
    if (candidate.workOrderType !== '其他问题' && !candidate.productLineId) throw new Error('请选择所属产品');
    if (isCreate) return persist({ ...candidate, id: context.id(), code: `WO-${context.id()}`, category: 'requirement', title: candidate.title.trim(), status: '待处理', assigneeId: assignee!.id, ownerName: assignee!.name, department: assignee!.department, creatorId: viewer.id, creatorName: viewer.name, revision: 0, createdAt: now, workItems: [], events: [event('提需求', { assigneeName: assignee!.name })] });
    if (body.assigneeId !== undefined && body.assigneeId !== current!.assigneeId || body.ownerName !== undefined && body.ownerName !== current!.ownerName) throw new Error('请通过转派修改事项负责人');
    return persist({ ...candidate, revision: revision + 1, events: [...(current!.events || []), event('修改事项')] });
  }
  if (parts[3] === 'reassign' && method === 'POST') {
    if (!owner || current!.status !== '待处理') throw new Error('仅当前负责人可转派待处理事项');
    if (current!.pendingReassignment) throw new Error('已有待接收的转派');
    const target = people.find(person => person.id === body.assigneeId);
    if (!target || target.id === viewer.id) throw new Error('请选择其他有效负责人');
    if (!reason) throw new Error('请填写转派原因');
    const pending = { id: context.id(), assigneeId: target.id, assigneeName: target.name, reason, attachmentIds: Array.isArray(body.attachmentIds) ? body.attachmentIds : [] };
    return persist({ ...current!, pendingReassignment: pending, revision: revision + 1, events: [...(current!.events || []), event('转派待受理', { ...pending, fromAssigneeName: current!.ownerName })] });
  }
  if (reassignmentAction && method === 'POST') {
    const pending = current!.pendingReassignment!;
    if (pending.assigneeId !== viewer.id) throw new Error('仅被转派人可处理转派');
    if (current!.status !== '待处理') throw new Error('事项状态已变化，请刷新后重试');
    const accepting = parts[4] === 'accept';
    const target = people.find(person => person.id === viewer.id);
    if (!target) throw new Error('负责人不存在或已停用');
    if (!accepting && !reason) throw new Error('请填写拒绝原因');
    return persist({ ...current!, ...(accepting ? { assigneeId: target.id, ownerName: target.name, department: target.department } : {}), pendingReassignment: undefined, revision: revision + 1, events: [...(current!.events || []), event(accepting ? '转派已接受' : '转派已拒绝', { ...pending, fromAssigneeName: current!.ownerName })] });
  }
  throw new Error('暂不支持此事项操作，数据未保存');
}
