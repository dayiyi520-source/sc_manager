// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkbenchFeedCard } from './WorkbenchFeedCard';
import type { WorkbenchFeed } from '../../services/workbenchFeeds';

afterEach(cleanup);
it.each(['square', 'dynamic'] as const)('shows the latest ten %s feeds by publication time', category => {
  const feeds: WorkbenchFeed[] = Array.from({ length: 12 }, (_, index) => ({ id: `${category}-${index}`, type: category, title: `信息-${index}`, content: '内容', time: `2026-10-${String(index + 1).padStart(2, '0')}`, ...(category === 'dynamic' ? { source: { module: '产品发布', recordId: String(index) }, versionId: `version-${index}` } : {}) }));
  render(<WorkbenchFeedCard category={category} feeds={feeds} onRetry={vi.fn()} onMore={vi.fn()} onOpen={vi.fn()} isNew={() => false} hasUpdates={false}/>);
  const card = screen.getByRole('region', { name: category === 'square' ? '信息广场' : '产品动态' });
  expect(within(card).getAllByRole('button', { name: /^信息-\d+$/ })).toHaveLength(10);
  expect(within(card).getByRole('button', { name: '信息-11' })).toBeInTheDocument();
  expect(within(card).queryByRole('button', { name: '信息-0' })).not.toBeInTheDocument();
});
