// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createTrainingState, loadTraining, saveTraining, trainingSummary, updateLearning, resolveTrainingWarning, submitTrainingExam } from './trainingRepository';

describe('local training records', () => {
  beforeEach(() => localStorage.clear());
  it('persists completion by user and calculates visible course statistics', () => {
    const state = updateLearning(createTrainingState(), 'training-1', 'presentation', '已完成');
    saveTraining('learner-a', state);
    expect(loadTraining('learner-a').records).toEqual(state.records);
    expect(loadTraining('learner-b').records.some(record => record.status === '已完成')).toBe(false);
    expect(trainingSummary(state)).toMatchObject({ total: 22, rate: 4.5, counts: { '已完成': 1, '学习中': 0, '未开始': 21 } });
    state.courses[0].published = false;
    expect(trainingSummary(state)).toMatchObject({ total: 20, rate: 0, counts: { '已完成': 0 } });
  });
  it('does not reset completed lessons when reviewed or duplicate records', () => {
    let state = updateLearning(createTrainingState(), 'training-1', 'presentation', '已完成');
    state = updateLearning(state, 'training-1', 'presentation', '学习中');
    expect(state.records.filter(record => record.courseId === 'training-1')).toHaveLength(1);
    expect(state.records.find(record => record.courseId === 'training-1')?.status).toBe('已完成');
  });
  it('rejects inactive and missing courses and reports corrupt storage', () => {
    const state = createTrainingState();
    state.courses[0].published = false;
    expect(() => updateLearning(state, 'training-1', 'presentation', '学习中')).toThrow();
    expect(() => updateLearning(state, 'missing', 'presentation', '学习中')).toThrow();
    localStorage.setItem('shichuang.training.demo.v1.learner', '{"courses":[null],"records":[]}');
    expect(() => loadTraining('learner')).toThrow('格式异常');
  });
  it('migrates old saved records without replacing learning history', () => {
    const state = createTrainingState();
    localStorage.setItem('shichuang.training.demo.v1.legacy', JSON.stringify({ courses: state.courses, records: state.records }));
    const loaded = loadTraining('legacy');
    expect(loaded.records).toEqual(state.records);
    expect(loaded.papers).toHaveLength(3);
    expect(loaded.batches).toHaveLength(3);
    expect(loaded.warnings).toEqual([]);
  });
  it('preserves old configuration and persists new system metadata with stable sorting', () => {
    const state = updateLearning(createTrainingState(), 'training-1', 'presentation', '已完成');
    state.courses.forEach(course => { delete course.sort; });
    saveTraining('legacy-config', state);
    const loaded = loadTraining('legacy-config');
    expect(loaded.records).toEqual(state.records);
    expect(trainingSummary(loaded).courses.map(course => course.id)).toEqual(state.courses.map(course => course.id));
    loaded.courses[0] = { ...loaded.courses[0], sort: 4, roles: ['学员'], materials: '系统学习资料', cover: 'data:image/png;base64,demo' };
    saveTraining('legacy-config', loaded);
    const restored = loadTraining('legacy-config');
    expect(restored.courses[0]).toEqual(loaded.courses[0]);
    expect(trainingSummary(restored).courses.at(-1)?.id).toBe('training-1');
    restored.courses[0].sort = -1;
    saveTraining('invalid-config', restored);
    expect(() => loadTraining('invalid-config')).toThrow('格式异常');
  });
  it('resolves warnings once and only resets the affected lesson', () => {
    let state = updateLearning(createTrainingState(), 'training-1', 'presentation', '已完成');
    state.warnings = [{ id: 'warning', courseId: 'training-1', lessonId: 'presentation', type: '演示异常', detail: '演示', time: new Date().toISOString(), status: '未处理' }];
    const resolved = resolveTrainingWarning(state, 'warning', '已确认');
    expect(resolved.records.find(record => record.courseId === 'training-1')?.status).toBe('需重学');
    expect(resolved.records.find(record => record.courseId === 'training-2')).toEqual(state.records.find(record => record.courseId === 'training-2'));
    expect(resolveTrainingWarning(resolved, 'warning', '已忽略')).toBe(resolved);
    expect(resolveTrainingWarning(state, 'warning', '已忽略').records).toEqual(state.records);
  });
  it('requires assignment, an open window and complete answers, scores once and persists', () => {
    const state = createTrainingState();
    state.papers = [{ id: 'paper', name: '演示试卷', enabled: true, passScore: 10, questions: [{ id: 'q1', title: '题目', options: ['A', 'B', 'C', 'D'], answer: 1, points: 10 }] }];
    state.batches = [{ id: 'batch', name: '演示批次', paperId: 'paper', start: '', end: '', enabled: true, learnerIds: ['learner'] }];
    expect(() => submitTrainingExam(state, 'batch', 'other', { q1: 1 })).toThrow('不可提交');
    expect(() => submitTrainingExam(state, 'batch', 'learner', {})).toThrow('所有题目');
    const submitted = submitTrainingExam(state, 'batch', 'learner', { q1: 1 });
    expect(submitted.attempts.find(attempt => attempt.batchId === 'batch')?.score).toBe(10);
    expect(() => submitTrainingExam(submitted, 'batch', 'learner', { q1: 0 })).toThrow('已交卷');
    saveTraining('learner', submitted); expect(loadTraining('learner').attempts).toEqual(submitted.attempts);
    state.batches[0].end = '2000-01-01T00:00';
    expect(() => submitTrainingExam(state, 'batch', 'learner', { q1: 1 })).toThrow('不可提交');
  });
});


describe('training exam demonstration', () => {
  beforeEach(() => localStorage.clear());
  it('seeds consistent question totals, assignments and answer-derived scores', () => {
    const state = createTrainingState();
    expect(state.papers.map(paper => paper.questions.length)).toEqual([35, 35, 20]);
    expect(state.papers.map(paper => paper.questions.reduce((sum, question) => sum + question.points, 0))).toEqual([100, 100, 100]);
    expect(state.batches.map(batch => batch.learnerIds.length)).toEqual([5, 6, 7]);
    expect(state.records).toEqual([]);
    state.attempts.forEach(attempt => {
      const batch = state.batches.find(item => item.id === attempt.batchId)!;
      const fresh = { ...state, attempts: [] };
      expect(submitTrainingExam(fresh, batch.id, attempt.userId, attempt.answers).attempts[0].score).toBe(attempt.score);
    });
  });
  it('migrates once, preserves existing data and never resurrects deleted demonstration data', () => {
    const state = createTrainingState();
    const custom = { ...state.papers[2], id: 'custom-paper', name: '自建试卷' };
    delete state.examDemoVersion;
    state.papers.push(custom);
    saveTraining('migration', state);
    const migrated = loadTraining('migration');
    expect(migrated.papers).toHaveLength(4);
    expect(migrated.papers.find(paper => paper.id === custom.id)).toEqual(custom);
    expect(migrated.attempts).toHaveLength(18);
    saveTraining('migration', { ...migrated, papers: [custom], batches: [], attempts: [] });
    expect(loadTraining('migration').papers).toEqual([custom]);
    expect(loadTraining('migration').batches).toEqual([]);
  });
  it('scores multiple-choice answers only for a complete match regardless of order', () => {
    const state = createTrainingState();
    state.papers = [{ id: 'multi', name: '多选', enabled: true, passScore: 4, questions: [{ id: 'q', title: '多选题', type: 'multiple', options: ['A','B','C','D'], answer: [0,1], points: 4 }] }];
    state.batches = [{ id: 'multi-batch', name: '批次', paperId: 'multi', start: '', end: '', enabled: true, learnerIds: ['learner'] }];
    state.attempts = [];
    const score = (answer: number[]) => submitTrainingExam(state, 'multi-batch', 'learner', { q: answer }).attempts[0].score;
    expect(score([1,0])).toBe(4);
    expect(score([0])).toBe(0);
    expect(score([0,1,2])).toBe(0);
    expect(() => score([0,0])).toThrow('所有题目');
    expect(() => score([])).toThrow('所有题目');
    expect(() => score([4])).toThrow('所有题目');
    saveTraining('multi', state);
    expect(loadTraining('multi').papers).toEqual(state.papers);
  });
});
