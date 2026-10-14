// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import type { SaveVersionReviewInput } from '../types/versionReview';

describe('mock version review persistence', () => {
  beforeEach(() => localStorage.clear());
  it('seeds five reviews and persists create-submit, detail and delete', async () => {
    const seeded = await mockApiRequest('/api/version-reviews') as Array<{ id: string }>;
    expect(seeded.length).toBeGreaterThanOrEqual(5);
    const products = await mockApiRequest('/api/product-lines') as Array<{ id: string; name: string; versions: Array<{ id: string; name: string }> }>;
    const product = products.find(item => item.versions?.length);
    expect(product).toBeTruthy();
    const members = await mockApiRequest('/api/team-members/options') as Array<{ id: string }>;
    const input: SaveVersionReviewInput = { meetingTopic: '新增版本评审', reviewType: '产品内部审核', productLineId: product!.id, versionId: product!.versions[0].id, meetingTime: '2026-10-14T06:00:00.000Z', reviewDate: '2026-10-14', participantIds: members.slice(0, 2).map(item => item.id), relatedTaskIds: [], conclusion: '通过', agendaConclusion: '评审通过', remainingIssues: '', attachments: [] };
    const created = await mockApiRequest(`/api/product-lines/${product!.id}/versions/${product!.versions[0].id}/reviews/submit`, { method: 'POST', body: JSON.stringify(input) }) as { id: string; status: string; participants: unknown[] };
    expect(created.status).toBe('SUBMITTED');
    expect(created.participants).toHaveLength(2);
    const detail = await mockApiRequest(`/api/product-lines/${product!.id}/versions/${product!.versions[0].id}/reviews/${created.id}`) as { id: string; participants: unknown[] };
    expect(detail.id).toBe(created.id);
    expect(detail.participants).toHaveLength(2);
    const afterReload = await mockApiRequest('/api/version-reviews') as Array<{ id: string }>;
    expect(afterReload.some(item => item.id === created.id)).toBe(true);
    const updated = await mockApiRequest(`/api/product-lines/${product!.id}/versions/${product!.versions[0].id}/reviews/${created.id}/submit`, { method: 'PUT', body: JSON.stringify({ ...input, meetingTopic: '编辑后评审', revision: 1 }) });
    expect(updated.meetingTopic).toBe('编辑后评审');
    await mockApiRequest(`/api/product-lines/${product!.id}/versions/${product!.versions[0].id}/reviews/${created.id}`, { method: 'DELETE', body: JSON.stringify({ revision: updated.revision }) });
    const afterDelete = await mockApiRequest('/api/version-reviews') as Array<{ id: string }>;
    expect(afterDelete.some(item => item.id === created.id)).toBe(false);
  });
});