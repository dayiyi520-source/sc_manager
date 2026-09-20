/* @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { employeeSelectOptions, formatEmployeeOptionLabel, PersonAvatar, PersonIdentity } from './PersonIdentity';

describe('PersonIdentity', () => {
  it('shares the colored compact avatar style used by identity rows', () => {
    const { container } = render(<PersonAvatar name="林志豪" size={32} />);
    const avatar = container.querySelector('.ant-avatar');

    expect(screen.getByText('林')).toBeInTheDocument();
    expect(avatar).toHaveStyle({ width: '32px', height: '32px', fontSize: '10px' });
    expect(avatar?.getAttribute('style')).toContain('background-color: var(--');
  });

  it('renders surname avatar, name and position', () => {
    render(<PersonIdentity name="林志豪" subtitle="超级系统管理员" />);
    expect(screen.getByText('林')).toBeInTheDocument();
    expect(screen.getByText('林志豪')).toBeInTheDocument();
    expect(screen.getByText('超级系统管理员')).toBeInTheDocument();
  });

  it('uses a fixed compact size and a token-backed color in list mode', () => {
    const { container } = render(<PersonIdentity name="林志豪" variant="list" size={32} />);
    const identity = container.querySelector('[data-person-variant="list"]');
    const avatar = container.querySelector('.ant-avatar');

    expect(identity).toHaveClass('h-6');
    expect(avatar).toHaveStyle({ width: '24px', height: '24px', fontSize: '10px' });
    expect(avatar?.getAttribute('style')).toContain('background-color: var(--');
    expect(screen.getByText('林志豪')).toHaveClass('text-xs', 'leading-6');
  });

  it('normalizes employee option labels to name and position', () => {
    expect(formatEmployeeOptionLabel({ name: '王强', jobTitle: '研发工程师' })).toBe('王强 · 研发工程师');
    expect(employeeSelectOptions([{ id: '1', name: '李娜', roleTitle: '产品经理' }], 'name')).toEqual([
      { value: '李娜', label: '李娜 · 产品经理' },
    ]);
    expect(formatEmployeeOptionLabel({ name: '赵敏' })).toBe('赵敏 · 未设置职位');
  });
});
