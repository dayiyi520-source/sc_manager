import type { Opportunity } from '../../types';

type TaskLike = { taskGroup: 'mine' | 'assist'; type: string };

export const getMyTaskMetrics = (tasks: TaskLike[], opportunities: Opportunity[], projects: Array<{ id: string }>) => ({
  todoTaskCount: tasks.filter((task) => task.taskGroup === 'mine').length,
  collaborationCount: tasks.filter((task) => task.taskGroup === 'assist' && task.type !== 'work_order').length,
  workOrderCount: tasks.filter((task) => task.type === 'work_order').length,
  opportunityCount: opportunities.length,
  projectDeliveryCount: projects.length,
});
