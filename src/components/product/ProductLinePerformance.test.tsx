// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductLinePerformance } from './ProductLinePerformance';
import type { UnifiedWorkItem } from '../../services/productRepository';

const item = (id: string, category: UnifiedWorkItem['category'], group: string, extra: Partial<UnifiedWorkItem> = {}): UnifiedWorkItem => ({
  id,
  code: id,
  title: id,
  category,
  productLineId: 'line-1',
  status: { name: group, group },
  ...extra
});

describe('product line performance', () => {
  it('uses top-level tasks for the seven metrics and excludes cancelled work from stock and completion', () => {
    render(<ProductLinePerformance items={[
      item('done', 'requirement', 'COMPLETED'),
      item('open', 'dev', 'IN_PROGRESS'),
      item('cancelled', 'test', 'CANCELLED'),
      item('child', 'dev', 'IN_PROGRESS', { parentWorkItemId: 'open' }),
      item('defect', 'bug', 'IN_PROGRESS')
    ]} />);

    expect(screen.getByText('任务总数').previousElementSibling).toHaveTextContent('3');
    expect(screen.getByText('存量任务').previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('缺陷总数').previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('存量缺陷').previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('完成率').previousElementSibling).toHaveTextContent('33%');
  });
});
