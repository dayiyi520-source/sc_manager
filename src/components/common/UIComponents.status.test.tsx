/* @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusTag } from './UIComponents';

describe('StatusTag legacy priority display', () => {
  it.each([
    ['P0', '紧急', 'danger'], ['P0-紧急阻断', '紧急', 'danger'],
    ['P1', '高', 'warning'], ['P2-普通', '中', 'default'],
    ['P3', '低', 'default'], ['待评审', '待评审', 'warning'],
    ['处理中', '处理中', 'warning'], ['未知阶段', '未知阶段', 'default']
  ])('renders %s as %s', (value, label, semantic) => {
    const { unmount } = render(<StatusTag status={value} />);
    const tag = screen.getByText(label);
    expect(tag.className).toContain(semantic === 'default' ? 'text-[var(--text-body)]' : `text-[var(--${semantic === 'danger' ? 'danger' : 'warning'})]`);
    unmount();
  });
});
