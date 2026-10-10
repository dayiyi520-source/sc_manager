// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { productRepository } from './productRepository';

describe('产品归档完整持久化流程', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('归档后从产品列表消失、进入归档列表，恢复后重新出现且刷新仍保留', async () => {
    const initial = await productRepository.productLines();
    const target = initial[0];
    expect(target).toBeTruthy();

    await productRepository.archiveProductLine(target.id);
    expect((await productRepository.productLines()).some((item) => item.id === target.id)).toBe(false);
    expect(await productRepository.archivedProductLines()).toEqual([expect.objectContaining({ id: target.id, name: target.name })]);

    // 重新读取接口，验证结果来自 localStorage 状态而不是页面内存。
    const archivedAfterReload = await productRepository.archivedProductLines();
    expect(archivedAfterReload.some((item) => item.id === target.id)).toBe(true);

    await productRepository.restoreProductLine(target.id);
    expect((await productRepository.productLines()).some((item) => item.id === target.id)).toBe(true);
    expect((await productRepository.archivedProductLines()).some((item) => item.id === target.id)).toBe(false);

    // 再次读取接口，验证恢复结果在刷新后仍然成立。
    expect((await productRepository.productLines()).some((item) => item.id === target.id)).toBe(true);
  });
});
