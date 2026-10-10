// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { recordTrainingWatch, createTrainingState, loadTraining, saveTraining, stageLessons, trainingStages, trainingSummary, updateLearning } from './trainingRepository';
beforeEach(() => localStorage.clear());
it('keeps legacy stage grouping and preserves explicit empty stages after refresh', () => {
  const state = createTrainingState(); const system = state.courses[0];
  const stages = trainingStages(system);
  expect(stages).toHaveLength(2);
  system.stages = [...stages, { id: 'empty', title: '新增阶段', description: '说明', sort: 3, sequential: true, enabled: true }];
  saveTraining('admin', state);
  const loaded = loadTraining('admin').courses[0];
  expect(trainingStages(loaded)).toHaveLength(3);
  expect(stageLessons(loaded, loaded.stages![2])).toEqual([]);
});
it('hides disabled stages and courses and enforces sequential learning', () => {
  let state = createTrainingState(); const system = state.courses[0];
  system.stages = [{ id: 's', title: '阶段', description: '', sort: 0, sequential: true, enabled: true }];
  system.lessons = system.lessons.map((lesson, sort) => ({ ...lesson, stageId: 's', stage: '阶段', sort }));
  expect(() => updateLearning(state, system.id, 'operation', '学习中')).toThrow('前面的课程');
  state = updateLearning(state, system.id, 'presentation', '已完成');
  expect(updateLearning(state, system.id, 'operation', '学习中').records).toHaveLength(2);
  state.courses[0].lessons[1].enabled = false;
  expect(trainingSummary(state).courses[0].lessons).toHaveLength(1);
  state.courses[0].stages![0].enabled = false;
  expect(() => updateLearning(state, system.id, 'presentation', '学习中')).toThrow('停用');
});

it('saves actual watch progress, completes at duration, and resets for a new video', () => {
  let state = createTrainingState(); const course = state.courses[0]; const lesson = course.lessons[0];
  lesson.videos = [{ id: 'video', name: 'test.mp4', size: 100, uploadedAt: '', version: 1, duration: 10, note: '', active: true }];
  state = recordTrainingWatch(state, course.id, lesson.id, 'video', 4);
  saveTraining('admin', state); state = loadTraining('admin');
  expect(state.records[0]).toMatchObject({ watchedSeconds: 4, status: '学习中' });
  state = recordTrainingWatch(state, course.id, lesson.id, 'video', 10);
  expect(state.records[0].status).toBe('已完成');
  state.courses[0].lessons[0].videos![0].id = 'new-video';
  expect(() => recordTrainingWatch(state, course.id, lesson.id, 'video', 10)).toThrow('版本');
  expect(recordTrainingWatch(state, course.id, lesson.id, 'new-video', 1).records[0]).toMatchObject({ watchedSeconds: 1, status: '学习中' });
});
