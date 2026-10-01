import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiClient';
import { requirementRepository } from './requirementRepository';

describe('requirementRepository', () => {
  const storage = { value: new Map<string, string>(), getItem(key: string) { return this.value.get(key) ?? null; }, setItem(key: string, value: string) { this.value.set(key, value); }, removeItem(key: string) { this.value.delete(key); }, clear() { this.value.clear(); } };
  beforeEach(() => { vi.stubGlobal('sessionStorage', storage); });
  afterEach(() => {
    vi.unstubAllGlobals();
    storage.clear();
  });

  it('encodes list filters and unwraps the API payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', message: '', data: { items: [], page: 1, pageSize: 20, total: 0 }, requestId: 'r1' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await requirementRepository.list({ keyword: '客户 A', department: '产品中心' });

    expect(fetchMock.mock.calls[0][0]).toContain('keyword=%E5%AE%A2%E6%88%B7+A');
    expect(fetchMock.mock.calls[0][0]).toContain('department=%E4%BA%A7%E5%93%81%E4%B8%AD%E5%BF%83');
  });

  it('normalizes JSON special fields returned by the backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'OK',
      message: '',
      data: { items: [{ id: 'req-1', specialFields: '{"requestType":"新功能","requestSource":"客户反馈"}' }], page: 1, pageSize: 20, total: 1 },
      requestId: 'r-special-fields',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const result = await requirementRepository.list();

    expect(result.items[0].specialFields).toEqual({ requestType: '新功能', requestSource: '客户反馈' });
  });

  it('normalizes JSON array fields used by the requirement detail page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'OK',
      message: '',
      data: { id: 'req-1', media: '[]', ccNames: '["张瑞"]', sourceWorkOrderIds: 'invalid-json', sourceWorkOrderTitles: null },
      requestId: 'r-json-arrays',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const result = await requirementRepository.detail('req-1');

    expect(result.media).toEqual([]);
    expect(result.ccNames).toEqual(['张瑞']);
    expect(result.sourceWorkOrderIds).toEqual([]);
    expect(result.sourceWorkOrderTitles).toEqual([]);
  });

  it('surfaces structured API errors for failed transitions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: '请输入原因', data: null, requestId: 'r2' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));

    await expect(requirementRepository.transition('req-1', 'hold', '')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: '请输入原因' });
  });

  it('posts persisted reassignment with employee id and revision', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', message: '', data: { id: 'req-1', ownerName: '张瑞', version: 3 }, requestId: 'r-reassign' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requirementRepository.reassign('req-1', { assigneeId: 'employee-1', reason: '调整负责人', revision: 1 });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/requirements/req-1/reassign');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ assigneeId: 'employee-1', reason: '调整负责人', revision: 1 });
    expect(result.revision).toBe(3);
  });

  it('posts persisted memo content and revision', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', message: '', data: { id: 'req-1', status: '已完成', revision: 2 }, requestId: 'r-memo' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await requirementRepository.memo('req-1', { content: '无需继续处理', revision: 1 });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/requirements/req-1/memo');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ content: '无需继续处理', revision: 1 });
  });

  it('posts an idempotent downstream retry request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', message: '', data: null, requestId: 'r3' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await requirementRepository.retryWorkItem('work-1');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/requirements/work-items/work-1/retry');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('queries paginated downstream sync status with filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK', message: '', data: { items: [], page: 1, pageSize: 20, total: 0 }, requestId: 'r4' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await requirementRepository.syncStatus({ taskType: '售前支持', syncStatus: 'FAILED', page: 2, pageSize: 20 });

    expect(fetchMock.mock.calls[0][0]).toContain('/api/requirements/work-items/sync-status?');
    expect(fetchMock.mock.calls[0][0]).toContain('taskType=%E5%94%AE%E5%89%8D%E6%94%AF%E6%8C%81');
    expect(fetchMock.mock.calls[0][0]).toContain('syncStatus=FAILED');
    expect(fetchMock.mock.calls[0][0]).toContain('page=2');
  });
});
