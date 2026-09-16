import { describe, expect, it } from 'vitest';
import { buildWorkflowDefinition, createDefaultWorkItemStates, reorderWorkflowStates, setDefaultWorkflowState, validateWorkflowStates } from './WorkItemStateConfigDrawer';

describe('工作项状态配置', () => {
  it('拖拽只改变顺序，不改变默认状态', () => {
    const states = createDefaultWorkItemStates('test');
    const reordered = reorderWorkflowStates(states, 'status_in_progress', 'status_pending');

    const definition = buildWorkflowDefinition(reordered);

    expect(definition.states.map((state) => state.key)).toEqual(['status_in_progress', 'status_pending', 'status_completed']);
    expect(definition.states.filter((state) => state.initial).map((state) => state.key)).toEqual(['status_pending']);
  });

  it('修改默认状态时保持唯一默认值', () => {
    const states = createDefaultWorkItemStates('test');
    const next = setDefaultWorkflowState(states, 'status_in_progress');
    expect(next.filter((state) => state.initial).map((state) => state.key)).toEqual(['status_in_progress']);
  });

  it('缺少未开始或已完成阶段时返回统一提示', () => {
    const states = createDefaultWorkItemStates('test');
    const withoutCompleted = states.map((state) => ({ ...state, group: state.group === 'COMPLETED' ? 'IN_PROGRESS' as const : state.group }));

    expect(validateWorkflowStates(withoutCompleted)).toBe('状态流转必须包含至少一个‘未开始’和一个‘已完成’阶段的状态。');
  });

  it('状态码创建后稳定，完成标记由通用阶段推导', () => {
    const states = createDefaultWorkItemStates('test');
    const code = states[2].key;
    const definition = buildWorkflowDefinition(states.map((state) => state.key === code ? { ...state, successful: false, color: 'purple' } : state));

    expect(definition.states[2]).toMatchObject({ key: code, successful: true, color: 'purple' });
  });
});
