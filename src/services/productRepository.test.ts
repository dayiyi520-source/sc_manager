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
});
