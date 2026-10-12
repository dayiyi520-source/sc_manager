import { expect, it } from 'vitest';
import { withBusinessWorkItemCategories } from './businessWorkItemCategories';
it('adds business categories once and preserves saved category settings', () => {
  const initial = withBusinessWorkItemCategories([]);
  expect(initial.map((item) => item.code)).toEqual(['ops', 'presales', 'delivery']);
  const saved = initial.map((item) => ({ ...item, enabled: false, displayName: '已改名' }));
  expect(withBusinessWorkItemCategories(saved)).toEqual(saved);
  expect(withBusinessWorkItemCategories(initial)).toHaveLength(3);
});
