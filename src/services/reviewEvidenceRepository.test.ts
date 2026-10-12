// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collaborationEvidence, loadReviewEvidence, taskEvidence } from './reviewEvidenceRepository';
import { okrRepository } from './okrRepository';
import { productRepository } from './productRepository';
import { requirementRepository } from './requirementRepository';
vi.mock('./okrRepository', () => ({ okrRepository: { work: vi.fn() } }));
vi.mock('./productRepository', () => ({ productRepository: { productLines: vi.fn(), workItems: vi.fn() } }));
vi.mock('./requirementRepository', () => ({ requirementRepository: { allForScope: vi.fn(), transferredBy: vi.fn() } }));
const viewer = { id: 'me', name: '本人', department: '软件研发部' };
describe('review evidence adapters', () => {
  beforeEach(() => vi.resetAllMocks());
  it('keeps product, version, owner and actual completion information on task evidence', () => {
    const task = { id: 't', code: 'T', category: 'dev', title: '任务', productLineId: 'p', versionId: 'v', versionName: 'V1', assigneeName: '本人', status: { name: '已完成' }, createdAt: '2026-10-01', completedAt: '2026-10-13' };
    expect(taskEvidence(task, '产品甲', viewer)).toMatchObject({ sourceId: 't', productLineName: '产品甲', versionName: 'V1', completedAt: '2026-10-13', assigneeId: 'me' });
    expect(taskEvidence({ ...task, assigneeName: '其他人' }, '产品甲', viewer)).toBeUndefined();
  });
  it('includes historical participation and uses the closure event as completion date', () => {
    const task = { id: 'c', title: '事项', priority: '中', ownerName: '他人', creatorName: '他人', productLineName: '产品甲', versionName: '', dueDate: '', estimatedHours: 0, status: '已完成', events: [{ id: 'e', eventType: '事项转交', operatorName: '本人', createdAt: '2026-10-01' }, { id: 'done', eventType: '事项关闭', operatorName: '他人', toStatus: '已完成', createdAt: '2026-10-13' }] };
    expect(collaborationEvidence(task, viewer)).toMatchObject({ sourceId: 'c', participantNames: ['本人'], completedAt: '2026-10-13' });
  });
  it('fetches paged data and enriches saved IDs without duplicating source records', async () => {
    vi.mocked(okrRepository.work).mockResolvedValue([{ id: 'saved-id', sourceId: 't', kind: 'task', title: 'old', status: '处理中', createdAt: '', updatedAt: '', dueDate: '', actualHours: 0, estimatedHours: 0, sourceWorkOrderIds: '[]', linkVersion: 0 }]);
    vi.mocked(productRepository.productLines).mockResolvedValue([{ id: 'p', name: '产品甲', versions: [{ id: 'v', code: 'V1' }] }] as never);
    vi.mocked(productRepository.workItems).mockResolvedValue({ page: { total: 1, items: [{ id: 't', code: 'T', category: 'dev', title: '任务', productLineId: 'p', versionId: 'v', assigneeName: '本人', status: { name: '处理中' } }] } });
    vi.mocked(requirementRepository.allForScope).mockResolvedValue([]);
    vi.mocked(requirementRepository.transferredBy).mockResolvedValue(new Set());
    const rows = await loadReviewEvidence(viewer);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'saved-id', sourceId: 't', productLineName: '产品甲', versionName: 'V1' });
  });
});
