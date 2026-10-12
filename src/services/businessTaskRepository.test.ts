import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadBusinessTasks } from './businessTaskRepository';
import { productRepository } from './productRepository';
import type { RequirementTask } from '../types';
vi.mock('./productRepository', () => ({ productRepository: { businessTasks: vi.fn() } }));
const task = (id: string) => ({ id } as RequirementTask);
beforeEach(() => vi.mocked(productRepository.businessTasks).mockReset());
describe('complete business task collections', () => {
  it('reads every page and deduplicates records before computing scopes', async () => {
    vi.mocked(productRepository.businessTasks)
      .mockResolvedValueOnce({ items: [task('1'), task('2')], total: 3, page: 1, pageSize: 2 })
      .mockResolvedValueOnce({ items: [task('2'), task('3')], total: 3, page: 2, pageSize: 2 });
    expect((await loadBusinessTasks('presales')).map(item => item.id)).toEqual(['1', '2', '3']);
    expect(productRepository.businessTasks).toHaveBeenNthCalledWith(2, 'presales', { page: 2, pageSize: 200 });
  });
  it('rejects incomplete pages rather than reporting partial totals', async () => {
    vi.mocked(productRepository.businessTasks)
      .mockResolvedValueOnce({ items: [task('1')], total: 2, page: 1, pageSize: 1 })
      .mockResolvedValueOnce({ items: [task('1')], total: 2, page: 2, pageSize: 1 });
    await expect(loadBusinessTasks('delivery')).rejects.toThrow('数据不完整');
  });
  it('propagates network failure without exposing a partially loaded collection', async () => {
    vi.mocked(productRepository.businessTasks)
      .mockResolvedValueOnce({ items: [task('1')], total: 2, page: 1, pageSize: 1 })
      .mockRejectedValueOnce(new Error('网络中断'));
    await expect(loadBusinessTasks('delivery')).rejects.toThrow('网络中断');
  });
  it('supports a genuinely empty collection', async () => {
    vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 200 });
    expect(await loadBusinessTasks('presales')).toEqual([]);
  });
});
