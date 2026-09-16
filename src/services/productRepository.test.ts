import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { productRepository } from './productRepository';

describe('productRepository task API contract', () => {
  const storage = { value: new Map<string, string>(), getItem(key: string) { return this.value.get(key) ?? null; }, setItem(key: string, value: string) { this.value.set(key, value); }, removeItem(key: string) { this.value.delete(key); } };
  beforeEach(() => { vi.stubGlobal('sessionStorage', storage); storage.setItem('shichuang.session.token', 'test-token'); });
  afterEach(() => { vi.unstubAllGlobals(); storage.value.clear(); });

  it('uses independent bug and development task routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: [], message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await productRepository.tasks('bug');
    await productRepository.tasks('dev');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/bugs');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/dev-tasks');
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('passes server pagination and task filters without dropping the total', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: { items: [{ id: 'bug-1' }], page: 2, pageSize: 10, total: 31 }, message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await productRepository.tasks('bug', { page: 2, pageSize: 10, keyword: '登录', productLine: '协同平台', status: '待修复', ownerName: '张瑞' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/bugs?page=2&pageSize=10&keyword=%E7%99%BB%E5%BD%95&productLine=%E5%8D%8F%E5%90%8C%E5%B9%B3%E5%8F%B0&status=%E5%BE%85%E4%BF%AE%E5%A4%8D&ownerName=%E5%BC%A0%E7%91%9E');
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 31 });
  });

  it('keeps create and update routes scoped to the selected task table', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: { id: 'task-1' }, message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await productRepository.createTask('bug', { title: '缺陷' });
    await productRepository.updateTask('dev', 'task-2', { status: '已完成' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/bugs');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/dev-tasks/task-2');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
  });

  it('maps each business task kind to its own route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: [], message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await productRepository.businessTasks('presales');
    await productRepository.businessTask('delivery', 'delivery-1');
    await productRepository.updateBusinessTask('ops', 'ops-1', { status: '处理中' });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/presales-tasks', '/api/delivery-tasks/delivery-1', '/api/ops-tasks/ops-1']);
  });

  it('assigns a requirement through the selected product-line version route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: null, message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await productRepository.assignRequirementToVersion('line-1', 'version-1', 'requirement-1');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/product-lines/line-1/versions/version-1/requirements/requirement-1');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('plans and removes each supported work-item kind through the version route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: null, message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await productRepository.assignWorkItemToVersion('line-1', 'version-1', 'bug', 'bug-1');
    await productRepository.unassignWorkItemFromVersion('line-1', 'version-1', 'bug', 'bug-1');
    expect(fetchMock.mock.calls.map((call) => [call[0], call[1].method])).toEqual([
      ['/api/product-lines/line-1/versions/version-1/work-items/bug/bug-1', 'POST'],
      ['/api/product-lines/line-1/versions/version-1/work-items/bug/bug-1', 'DELETE']
    ]);
  });

  it('retries a transient GET failure once but does not retry writes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'OK', data: [], message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await productRepository.tasks('bug');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset().mockResolvedValue(new Response('', { status: 503 }));
    await expect(productRepository.createTask('bug', { title: '不应重试写入' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads persisted work-item relations for the detail association tab', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', data: { relations: [] }, message: '', requestId: 'r' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await productRepository.workItemRelations('line-1', 'task-1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/work-items/task-1/relations?productLineId=line-1');
  });
});
