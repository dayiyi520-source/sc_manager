import { MOCK_BUGS, MOCK_DESIGN_TASKS, MOCK_DEV_TASKS, MOCK_REQUIREMENT_TASKS, MOCK_TEST_TASKS, MOCK_USERS } from './mockSnapshot';

// 只增加独立演示记录；原有快照及浏览器保存内容不改负责人或权限。
export const PRODUCT_PREVIEW_SEED_VERSION = '2026-10-12-v1';
export function productTaskPreviewSamples() {
  const admin = MOCK_USERS.find(user => user.role === 'admin');
  if (!admin) return [];
  return [
    ['requirement', MOCK_REQUIREMENT_TASKS],
    ['design', MOCK_DESIGN_TASKS.filter(task => !task.designVariant || task.designVariant === 'product')],
    ['dev', MOCK_DEV_TASKS], ['test', MOCK_TEST_TASKS], ['bug', MOCK_BUGS],
  ].flatMap(([category, tasks]) => (tasks as Array<Record<string, any>>).filter(task => task.productLineId).slice(0, 3).map((task, index) => ({
    ...task, id: 'demo-preview-' + category + '-' + (index + 1), code: 'DEMO-' + String(category).toUpperCase() + '-00' + (index + 1),
    category, ownerName: admin.name, assigneeName: admin.name, assigneeId: admin.id,
    creatorName: admin.name, creatorId: admin.id, department: admin.department,
    parentWorkItemId: undefined, hasChildren: false, children: [], requirementId: undefined, workOrderType: undefined,
    relatedTaskIds: [], sourceWorkOrderIds: [], sourceWorkOrderTitles: [], events: [], revision: 0,
  })));
}
