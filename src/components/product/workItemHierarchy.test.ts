import { describe, expect, it } from 'vitest';
import { workItemHierarchy, workItemKey } from './workItemHierarchy';

const item = (id: string, parent?: string, productLineId = 'line-1') => ({ id, kind: 'dev', productLineId, source: { parentWorkItemId: parent } });

describe('workItemHierarchy', () => {
  it('keeps children and grandchildren under their parent independent of source order', () => {
    const root = item('root'), child = item('child', 'root'), leaf = item('leaf', 'child');
    const tree = workItemHierarchy([leaf, child, root]);
    expect(tree.roots).toEqual([root]);
    expect(tree.children.get(workItemKey(root))).toEqual([child]);
    expect(tree.children.get(workItemKey(child))).toEqual([leaf]);
  });
  it('keeps ancestor context when filtering a child without showing unrelated siblings', () => {
    const root = item('root'), child = item('child', 'root'), sibling = item('other', 'root');
    const tree = workItemHierarchy([root, child, sibling], [child]);
    expect(tree.roots).toEqual([root]);
    expect(tree.children.get(workItemKey(root))).toEqual([child]);
  });
  it('preserves version-scoped orphan children as visible roots', () => {
    const orphan = item('child', 'outside-version');
    expect(workItemHierarchy([orphan]).roots).toEqual([orphan]);
  });
  it('groups development and test descendants under their product task', () => {
    const root = { ...item('root'), kind: 'requirement' };
    const child = item('child', 'root');
    const leaf = { ...item('leaf', 'child'), kind: 'test' };
    const tree = workItemHierarchy([leaf, child, root], [leaf]);
    expect(tree.roots).toEqual([root]);
    expect(tree.children.get(workItemKey(root))).toEqual([child]);
    expect(tree.children.get(workItemKey(child))).toEqual([leaf]);
  });
  it('does not link different products and remains safe for corrupt cyclic data', () => {
    const root = item('root'), foreign = item('child', 'root', 'line-2');
    expect(workItemHierarchy([root, foreign]).roots).toEqual([root, foreign]);
    expect(workItemHierarchy([item('a', 'b'), item('b', 'a')]).roots).toHaveLength(2);
  });
});
