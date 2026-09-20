/* @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { employeeSelectOptions, formatEmployeeOptionLabel, PersonIdentity } from './PersonIdentity';

describe('PersonIdentity', () => {
  it('renders surname avatar, name and position', () => {
    render(<PersonIdentity name="林志豪" subtitle="超级系统管理员" />);
    expect(screen.getByText('林')).toBeInTheDocument();
    expect(screen.getByText('林志豪')).toBeInTheDocument();
    expect(screen.getByText('超级系统管理员')).toBeInTheDocument();
  });

  it('normalizes employee option labels to name and position', () => {
    expect(formatEmployeeOptionLabel({ name: '王强', jobTitle: '研发工程师' })).toBe('王强 · 研发工程师');
    expect(employeeSelectOptions([{ id: '1', name: '李娜', roleTitle: '产品经理' }], 'name')).toEqual([
      { value: '李娜', label: '李娜 · 产品经理' },
    ]);
    expect(formatEmployeeOptionLabel({ name: '赵敏' })).toBe('赵敏 · 未设置职位');
  });
});
