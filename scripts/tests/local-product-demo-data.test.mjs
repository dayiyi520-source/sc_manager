import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlan } from '../local-product-demo-data.mjs';

const product = { id_: 'aba9ad7d-5718-4230-bdd7-470d05f85557', name_: '师创砺知堂' };
const type = { id_: 'type-1', product_line_id_: product.id_, category_: '需求', name_: '产品类型需求' };
const states = ['待处理', '已评审', '进行中', '已完成', '已取消'].map((name, index) => ({
  key: `state-${index}`, name, enabled: true, group: index === 0 ? 'NOT_STARTED' : index === 3 ? 'COMPLETED' : index === 4 ? 'CANCELLED' : 'IN_PROGRESS', successful: index === 3
}));
const versions = ['b827622b-3ce5-44c1-b38c-9b25f207382e', '4f1149ef-84f9-43fd-9da1-191411998a0d', 'f7ce5998-fce4-4c12-a9aa-bb427ee00288']
  .map((id_, index) => ({ id_, product_line_id_: product.id_, status_: '进行中', start_date_: `2026-10-0${index + 1}`, end_date_: `2026-10-2${index + 1}` }));
const fixture = () => ({
  products: [product], templates: [{ id_: 'template-1', category_: '设计', name_: '交互设计' }],
  templateFlows: [{ template_type_id_: 'template-1', definition_: { states } }], types: [type],
  flows: [
    { id_: 'old', product_line_id_: product.id_, task_type_id_: type.id_, workflow_version_: 1, status_: 'PUBLISHED', definition_: { states: states.filter((state) => state.name !== '已评审') } },
    { id_: 'latest', product_line_id_: product.id_, task_type_id_: type.id_, workflow_version_: 3, status_: 'PUBLISHED', definition_: { states } }
  ], versions, items: [], users: [
    { id_: 'user-1', name_: '毛景强', department_: '产品规划部', status_: 'enabled' },
    { id_: 'user-2', name_: '林志豪', department_: '产品规划部', status_: 'enabled' }
  ]
});

test('only fills missing product types and uses the newest published product workflow', () => {
  const data = fixture();
  const plan = buildPlan(data);
  assert.equal(plan.missing.length, 1);
  assert.equal(plan.tasks.length, 11);
  assert.ok(plan.tasks.every((task) => task.workflow.id_ === 'latest'));
  assert.equal(plan.tasks.filter((task) => task.versionId === null).length, 3);
  assert.ok(plan.tasks.every((task) => task.owner.department_ === '产品规划部'));

  data.types.push({ ...data.templates[0], product_line_id_: product.id_ });
  data.items = plan.tasks.map((task) => ({ product_line_id_: product.id_, category_: 'requirement', title_: task.title }));
  assert.deepEqual([buildPlan(data).missing.length, buildPlan(data).tasks.length], [0, 0]);
});
