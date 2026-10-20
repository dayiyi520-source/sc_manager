import { describe, expect, it } from 'vitest';
import { getMyTaskMetrics } from './myTasksMetrics';

describe('我的任务指标口径', () => {
  it('统计未结束任务、协同事项、工单、商机和项目交付', () => {
    const metrics = getMyTaskMetrics([
      { taskGroup: 'mine', type: 'task' },
      { taskGroup: 'assist', type: 'assistance' },
      { taskGroup: 'assist', type: 'work_order' },
    ], [{ id: 'opportunity-1' } as any, { id: 'opportunity-2' } as any], [{ id: 'project-1' } as any]);

    expect(metrics).toEqual({ todoTaskCount: 1, collaborationCount: 1, workOrderCount: 1, collaborationAndWorkOrderCount: 2, opportunityCount: 2, projectDeliveryCount: 1 });
  });

  it('没有工单或协同事项时合计仍准确', () => {
    expect(getMyTaskMetrics([{ taskGroup: 'assist', type: 'assistance' }], [], [])).toMatchObject({ collaborationCount: 1, workOrderCount: 0, collaborationAndWorkOrderCount: 1 });
    expect(getMyTaskMetrics([{ taskGroup: 'assist', type: 'work_order' }], [], [])).toMatchObject({ collaborationCount: 0, workOrderCount: 1, collaborationAndWorkOrderCount: 1 });
    expect(getMyTaskMetrics([], [], [])).toMatchObject({ collaborationAndWorkOrderCount: 0 });
  });
});

