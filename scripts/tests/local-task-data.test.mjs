import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlan } from '../local-task-data.mjs';

const person = (id_, name_, department_) => ({ id_, name_, department_, status_: 'enabled' });
const states = [
  { key: 'todo', name: '待开始', group: 'NOT_STARTED', color: 'neutral', enabled: true, initial: true, successful: false },
  { key: 'done', name: '已完成', group: 'COMPLETED', color: 'success', enabled: true, successful: true },
];
const item = (id_, category_) => ({ id_, category_, product_line_id_: 'product', task_type_id_: category_, workflow_id_: category_,
  title_: '演示任务', status_key_: 'todo', status_name_: '待开始', status_group_: 'NOT_STARTED', status_color_: 'neutral', successful_: 0,
  priority_: 'P2', version_: 0, estimated_hours_: 0, actual_hours_: 0, progress_: 0 });
const fixture = () => ({
  users: [person('planner', '产品经理', '产品规划部'), person('tester', '测试人员', '测试部'), person('designer', '设计人员', '交互设计部')],
  members: [{ user_id_: 'tester', role_: '测试' }], products: [{ id_: 'product' }], versions: [],
  types: ['requirement', 'design', 'dev', 'test', 'bug'].map(id_ => ({ id_, product_line_id_: 'product' })),
  workflows: ['requirement', 'design', 'dev', 'test', 'bug'].map(id_ => ({ id_, category_: id_, product_line_id_: 'product', status_: 'PUBLISHED', definition_: { states } })),
  items: [item('design-1', 'design'), item('bug-1', 'bug'), { ...item('assistance', 'requirement'), work_order_type_: '其他问题' }],
});

test('supplements only tasks with eligible personnel, independent dates and no source assistance', () => {
  const data = fixture();
  const plan = buildPlan(data);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map(p => p.id), ['design-1', 'bug-1']);
  assert.equal(plan[0].changes.create_by_, 'planner');
  assert.equal(plan[0].changes.assignee_id_, 'planner');
  assert.equal(plan[1].changes.assignee_id_, 'tester');
  assert.ok(['planner', 'tester', 'designer'].includes(plan[1].changes.create_by_));
  assert.equal(plan[0].changes.priority_, undefined);
  assert.equal(plan[0].changes.status_key_, undefined);
  assert.ok(plan[0].changes.planned_start_date_ <= plan[0].changes.planned_end_date_);
  const replay = structuredClone(data);
  for (const change of plan) Object.assign(replay.items.find(w => w.id_ === change.id), change.changes);
  assert.equal(buildPlan(replay).length, 0);
});

test('rejects an invalid product association before preparing any writes', () => {
  const data = fixture();
  data.items[0].product_line_id_ = 'missing';
  assert.throws(() => buildPlan(data), /产品关联无效/);
});
