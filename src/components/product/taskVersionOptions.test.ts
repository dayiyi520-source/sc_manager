import { expect, it } from 'vitest';
import { taskVersionOptions } from './taskVersionOptions';
import type { VersionIteration } from '../../types';

it('uses product identity despite an outdated name, excludes another product with the same name', () => {
  const versions = [
    { id: 'correct', name: 'V1', productLineId: 'p1', productLineName: '旧产品名' },
    { id: 'other', name: 'V1', productLineId: 'p2', productLineName: '院校门户系统' },
    { id: 'legacy', name: '旧版本', productLineName: '院校门户系统' },
    { id: 'unknown', name: '无归属版本' },
  ] as VersionIteration[];
  expect(taskVersionOptions(versions, { id: 'p1', name: '院校门户系统' }).map(v => v.id)).toEqual(['correct', 'legacy']);
  expect(taskVersionOptions(versions)).toEqual([]);
});
