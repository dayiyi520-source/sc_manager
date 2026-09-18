// @vitest-environment jsdom

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TestTaskWorkspace } from './TestTaskWorkspace';

const mocks = vi.hoisted(() => ({ props: vi.fn() }));
vi.mock('./RequirementTasksView', () => ({
  RequirementTasksView: (props: Record<string, unknown>) => { mocks.props(props); return <div>测试任务列表</div>; }
}));

describe('TestTaskWorkspace', () => {
  it('keeps test-specific creation and detail behavior behind narrow extension props', () => {
    render(<TestTaskWorkspace productLineFilter="line-1" />);
    expect(mocks.props).toHaveBeenCalledWith(expect.objectContaining({
      productLineFilter: 'line-1',
      taskKind: 'test',
      createPolicy: expect.not.objectContaining({ requireRequirement: true }),
      renderDetail: expect.any(Function),
    }));
  });
});
