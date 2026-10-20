import { reviewEvidenceMetadata } from './reviewEvidenceSnapshot';
import { describe, expect, it } from 'vitest';
import { goalReviewEvidence, goalEvidenceProducts, goalEvidenceProjects } from './goalReviewEvidence';
import type { OkrRecord, OkrWork, OkrPerson } from './okrRepository';
const goal: OkrRecord = { id: 'g', kind: 'objective', ownerId: 'manager', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '目标', keyResults: [{ id: 'kr', title: '关键结果', progress: 0, weight: 100 }] } };
const personal: OkrRecord = { ...goal, id: 'personal', ownerId: 'staff', payload: { title: '员工目标', goalLevel: 'personal', sourceObjectiveId: 'g', sourceKrId: 'kr', keyResults: [{ id: 'kr', title: '承接KR', progress: 0, weight: 100, executionActions: [{ id: 'a', title: '个人动作', ownerId: 'staff', progress: 0 }] }] } };
const people = [{ id: 'staff', name: '员工甲' }, { id: 'other', name: '员工乙' }] as OkrPerson[];
const item = { workId: 'task:t1', sourceId: 't1', title: '历史任务', status: '已完成', taskType: 'dev', workType: 'task' as const, actualHours: 3, productLineName: '产品甲', versionName: 'V1', projectName: '项目甲', result: '', impact: '' };
const review: OkrRecord = { ...goal, id: 'r', kind: 'review', ownerId: 'staff', status: 'submitted', payload: { title: '员工复盘', krReviews: [{ objectiveId: 'personal', keyResultId: 'a', workIds: ['task:t1'], objectiveTitle: '目标', keyResultTitle: '动作', previousProgress: 0, currentProgress: 50, health: 'normal', achievement: '', blocker: '', nextPlan: '' }], items: [item] } };
describe('目标详情复盘证据', () => {
  it('沿主管KR到员工A归集，实时工作项缺失仍保留快照', () => {
    const tasks = goalReviewEvidence(goal, 'kr', [goal, personal, review], [], people);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ title: '历史任务', sourceEmployees: ['员工甲'], taskType: 'dev', savedHours: 3, snapshotOnly: true });
    expect(goalEvidenceProducts(tasks)[0]).toMatchObject({ name: '产品甲', version: 'V1', total: 1, done: 1, progress: 100 });
    expect(goalEvidenceProjects(tasks)).toEqual([{ name: '项目甲', productCount: 1, taskCount: 1 }]);
    expect(goalReviewEvidence(personal, 'a', [goal, personal, review], [], people)).toHaveLength(1);
  });
  it('排除草稿和其他KR，同任务重复复盘只计一次且保留员工来源', () => {
    const second = { ...review, id: 'r2', ownerId: 'other' };
    const unrelated = { ...review, id: 'r3', payload: { ...review.payload, krReviews: [{ ...review.payload.krReviews![0], keyResultId: 'other' }], items: [{ ...item, workId: 'other' }] } };
    const draft = { ...review, id: 'draft', status: 'draft', payload: { ...review.payload, items: [{ ...item, title: '草稿任务' }] } };
    const tasks = goalReviewEvidence(goal, 'kr', [goal, personal, review, second, unrelated, draft], [], people);
    expect(tasks).toHaveLength(1); expect(tasks[0].sourceEmployees).toEqual(['员工甲', '员工乙']);
  });
  it('归集主管复盘中保存的员工快照，并兼容旧sourceLabel产品版本', () => {
    const saved = { ...item, productLineName: undefined, versionName: undefined, sourceLabel: '旧产品 / V2' };
    const managerReview = { ...review, ownerId: 'manager', payload: { ...review.payload, krReviews: [{ ...review.payload.krReviews![0], objectiveId: 'g', keyResultId: 'kr', workIds: [], employeeReviewSnapshots: [{ id: 'saved', title: '快照', authorId: 'staff', authorName: '员工甲', status: 'submitted', startDate: '', endDate: '', krReviews: review.payload.krReviews!, items: [saved], assistance: [] }] }] } };
    expect(goalReviewEvidence(goal, 'kr', [goal, managerReview], [], people)[0]).toMatchObject({ productLineName: '旧产品', versionName: 'V2', sourceEmployees: ['员工甲'] });
  });
  it('使用最新工作状态计算完成率，并按产品版本分别统计', () => {
    const work = [{ id: 'task:t1', sourceId: 't1', kind: 'task', title: '最新任务', status: '处理中', productLineName: '产品甲', versionName: 'V2' }] as OkrWork[];
    const tasks = goalReviewEvidence(goal, 'kr', [goal, personal, review], work, people);
    expect(tasks[0].title).toBe('最新任务');
    expect(goalEvidenceProducts(tasks)[0]).toMatchObject({ version: 'V2', total: 1, done: 0, progress: 0 });
    expect(goalReviewEvidence(goal, 'missing', [goal, personal, review], work, people)).toEqual([]);
  });
  it('后续稀疏快照保留已保存的任务类型和项目，并合并新旧产品标识', () => {
    const sparse = { ...review, id: 'later', submittedAt: '2026-10-20', payload: { ...review.payload, items: [{ workId: item.workId, title: item.title, status: '已完成', sourceLabel: '产品甲 / V1', result: '', impact: '' }] } };
    expect({ ...item, ...reviewEvidenceMetadata({ sourceId: 't1' } as OkrWork) }).toMatchObject({ projectName: '项目甲', taskType: 'dev' });
    const tasks = goalReviewEvidence(goal, 'kr', [goal, personal, review, sparse], [], people);
    expect(tasks[0]).toMatchObject({ projectName: '项目甲', taskType: 'dev', savedHours: 3 });
    const mixed = [...tasks, { ...tasks[0], id: 't2', sourceId: 't2', productLineId: 'p', versionId: 'v' }];
    expect(goalEvidenceProducts(mixed)).toHaveLength(1);
    expect(goalEvidenceProducts(mixed)[0]).toMatchObject({ total: 2, done: 2 });
    expect(goalEvidenceProjects(mixed)[0]).toMatchObject({ productCount: 1, taskCount: 2 });
  });

});
