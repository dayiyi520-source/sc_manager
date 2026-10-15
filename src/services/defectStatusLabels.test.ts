import { expect, it } from 'vitest';
import { normalizeDefectStatusLabels } from './defectStatusLabels';
it('normalizes historical statuses and workflow labels without rewriting prose or identifiers', () => {
  const input = { title: '再不修复', description: '再不修复', status: '再不修复', definition: { states: [{ key: '再不修复', name: '再不修复', group: 'CANCELLED' }], transitions: [{ key: 'edge', from: 'todo', to: '再不修复', name: '进入再不修复' }] } };
  const result = normalizeDefectStatusLabels(input);
  expect(result).toMatchObject({ title: '再不修复', description: '再不修复', status: '暂不修复', definition: { states: [{ key: '再不修复', name: '暂不修复', group: 'CANCELLED' }], transitions: [{ key: 'edge', to: '再不修复', name: '进入暂不修复' }] } });
  expect(input.status).toBe('再不修复');
  expect(normalizeDefectStatusLabels(result)).toBe(result);
});
