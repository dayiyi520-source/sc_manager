export const TASK_TYPES = {
  requirement: '产品需求', dataRequirement: '数据需求', bug: '缺陷管理', design: '设计任务',
  presales: '售前任务', delivery: '交付任务', ops: '运维任务', development: '研发任务',
} as const;

export type TaskType = typeof TASK_TYPES[keyof typeof TASK_TYPES];

export const TASK_PAGE_BY_TYPE: Record<string, string> = {
  [TASK_TYPES.requirement]: 'prod_req_tasks', [TASK_TYPES.dataRequirement]: 'prod_req_tasks',
  [TASK_TYPES.bug]: 'prod_bugs', [TASK_TYPES.design]: 'prod_design_tasks',
  [TASK_TYPES.presales]: 'crm_presales_tasks', [TASK_TYPES.delivery]: 'proj_delivery_tasks',
  [TASK_TYPES.ops]: 'proj_ops_tasks', [TASK_TYPES.development]: 'prod_rd_tasks',
  bug修复: 'prod_bugs', 售前支持: 'crm_presales_tasks', 项目交付: 'proj_delivery_tasks',
  交付支持: 'proj_delivery_tasks', 运维部署: 'proj_ops_tasks', 技术问题: 'prod_rd_tasks',
};
