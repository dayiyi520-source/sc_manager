import type { Opportunity } from '../../types';

type TaskLike = { taskGroup: 'mine' | 'assist'; type: string };

export const getMyTaskMetrics = (tasks: TaskLike[], opportunities: Opportunity[], projects: Array<{ id: string }>) => {
  const collaborationCount = tasks.filter((task) => task.taskGroup === 'assist' && task.type !== 'work_order').length;
  const workOrderCount = tasks.filter((task) => task.type === 'work_order').length;

  return {
    todoTaskCount: tasks.filter((task) => task.taskGroup === 'mine').length,
    collaborationCount,
    workOrderCount,
    collaborationAndWorkOrderCount: collaborationCount + workOrderCount,
    opportunityCount: opportunities.length,
    projectDeliveryCount: projects.length,
  };
};
