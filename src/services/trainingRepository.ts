import { addTrainingExamDemo } from './trainingExamDemo';
export type LearningStatus = '未开始' | '学习中' | '已完成' | '需重学';
export interface TrainingStage { id: string; title: string; description: string; sort: number; sequential: boolean; enabled: boolean }
export interface TrainingFile { id: string; name: string; size: number; uploadedAt: string }
export interface TrainingVideo extends TrainingFile { version: number; duration: number; note: string; active: boolean }
export interface TrainingSystemFile extends TrainingFile { title: string; description: string; enabled: boolean }
export interface TrainingLesson { id: string; title: string; stage: string; content: string; stageId?: string; sort?: number; enabled?: boolean; requirements?: string; videos?: TrainingVideo[]; files?: TrainingFile[] }
export interface TrainingCourse {
  id: string; title: string; description: string; cover: string; version: string; published: boolean;
  lessons: TrainingLesson[]; stages?: TrainingStage[]; sort?: number; roles?: string[]; materials?: string; files?: TrainingSystemFile[];
}

export function trainingStages(course: TrainingCourse): TrainingStage[] {
  return course.stages ?? [...new Set(course.lessons.map(lesson => lesson.stage))].map((title, sort) => ({ id: title, title, description: '', sort, sequential: false, enabled: true }));
}
export function stageLessons(course: TrainingCourse, stage: TrainingStage) {
  return course.lessons.filter(lesson => lesson.stageId ? lesson.stageId === stage.id : lesson.stage === stage.title).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}
export function learningLessons(course: TrainingCourse) {
  return trainingStages(course).filter(stage => stage.enabled).sort((a, b) => a.sort - b.sort).flatMap(stage => stageLessons(course, stage).filter(lesson => lesson.enabled !== false));
}
export interface LearningRecord {
  courseId: string; lessonId: string; status: LearningStatus; updatedAt: string; videoId?: string; watchedSeconds?: number;
}
export interface TrainingQuestion { id: string; title: string; options: string[]; answer: number | number[] | string; type?: 'single' | 'multiple' | 'short'; points: number; referenceAnswer?: string }
export interface TrainingPaper { id: string; name: string; passScore: number; enabled: boolean; questions: TrainingQuestion[] }
export interface TrainingBatch { id: string; name: string; paperId: string; start: string; end: string; enabled: boolean; learnerIds: string[] }
export interface TrainingAttempt { batchId: string; userId: string; score: number; submittedAt: string; answers: Record<string, number | number[] | string> }
export interface TrainingWarning { id: string; courseId: string; lessonId: string; type: string; detail: string; time: string; status: '未处理' | '已忽略' | '已确认' }
export interface TrainingLearner { id: string; name: string; account: string; department: string; phone?: string }
export interface TrainingState { learners?: TrainingLearner[]; examDemoVersion?: number; courses: TrainingCourse[]; records: LearningRecord[]; papers: TrainingPaper[]; batches: TrainingBatch[]; attempts: TrainingAttempt[]; warnings: TrainingWarning[] }

const catalog = [
  ['智能化校园整体PPT汇报', '包括公司简介、建设思路、痛点、建设内容框架、每块内容的详细拆解分析。'],
  ['重大项目管理与绩效评价平台', '面向高职院校“新双高”等重大项目建设场景，依托一体化管控范式，打通任务、资金与绩效全链路。'],
  ['产教融合校企合作服务平台', '围绕企业入库、合作立项、过程协同与成效考核，构建校内与校外双循环生态。'],
  ['办学能力评价服务平台', '聚焦办学条件监测与教学工作评估两大核心任务，深度分析办学能力。'],
  ['专业建设套件服务平台', '融合教学标准建设、专业过程管理与专业建设评价三大平台，支撑专业建设全过程。'],
  ['教师教学档案袋', '面向教师全生命周期档案，呈现教学成果、专业成长与能力发展。'],
  ['校园大脑服务平台', '以数据要素为核心，构建涵盖标准管理、常态采集、便捷上报与深度赋能的一体化服务。'],
  ['臻知会', '围绕会员懂行、会员懂产品、会员能基础对外沟通，提供新人学习资料。'],
  ['企业文化与价值观', '了解企业使命、价值观与团队协作方式，建立共同的工作语言。'],
  ['售前方案与演示汇报', '学习业务需求分析、方案编制与产品演示，形成完整的售前沟通思路。'],
  ['产品操作与交付实践', '了解系统基础操作、交付流程与常见问题，提升项目协作能力。']
];

export function createTrainingState(): TrainingState {
  const courses = catalog.map(([title, description], index): TrainingCourse => ({
    id: `training-${index + 1}`, title, description, cover: `/training/course-${index + 1}.jpg`,
    version: 'V1.0.0', published: true, sort: index,
    lessons: [
      { id: 'presentation', title: 'PPT业务理解', stage: '第一阶段 · 业务认知', content: `${description}\n\n学习目标\n1. 理解业务背景与目标用户。\n2. 梳理核心业务场景与产品价值。\n3. 结合配套资料整理汇报思路。\n\n本地演示资料；正式课程视频与配套文件待配置。` },
      { id: 'operation', title: '系统操作演示', stage: '第二阶段 · 操作实践', content: '学习目标\n1. 了解核心功能与操作流程。\n2. 按业务场景梳理关键操作步骤。\n3. 记录疑问与常见问题。\n\n本地演示资料；正式课程视频与配套文件待配置。' }
    ]
  }));
  return addTrainingExamDemo({ courses, records: [], papers: [], batches: [], attempts: [], warnings: [] });
}

const storageKey = (userId: string) => `shichuang.training.demo.v1.${userId}`;
export function loadTraining(userId: string): TrainingState {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return createTrainingState();
  const state: unknown = JSON.parse(raw);
  if (!state || typeof state !== 'object' || !('courses' in state) || !('records' in state)
    || !Array.isArray(state.courses) || !Array.isArray(state.records)) throw new Error('本地培训记录无法读取，请检查浏览器存储后重试');
  const data = state as TrainingState;
  if (data.courses.some(course => !course?.id || typeof course.title !== 'string' || !Array.isArray(course.lessons)
    || (course.sort !== undefined && (!Number.isInteger(course.sort) || course.sort < 0))
    || (course.roles !== undefined && (!Array.isArray(course.roles) || course.roles.some(role => typeof role !== 'string')))
    || (course.materials !== undefined && typeof course.materials !== 'string')
    || course.lessons.some(lesson => !lesson?.id || typeof lesson.content !== 'string'))
    || data.records.some(record => !record?.courseId || !record.lessonId || !['未开始', '学习中', '已完成', '需重学'].includes(record.status))) {
    throw new Error('本地培训记录格式异常，请检查浏览器存储后重试');
  }
  const migrated = { ...data, papers: data.papers ?? [], batches: data.batches ?? [], attempts: data.attempts ?? [], warnings: data.warnings ?? [] };
  if ((migrated.learners !== undefined && (!Array.isArray(migrated.learners) || migrated.learners.some(learner => !learner?.id || typeof learner.name !== 'string' || typeof learner.account !== 'string' || typeof learner.department !== 'string')))
    || !Array.isArray(migrated.papers) || !Array.isArray(migrated.batches) || !Array.isArray(migrated.attempts) || !Array.isArray(migrated.warnings)
    || migrated.papers.some(paper => !paper?.id || typeof paper.name !== 'string' || !Array.isArray(paper.questions)
      || paper.questions.some(question => !question?.id || typeof question.title !== 'string' || !Array.isArray(question.options) || question.options.length !== 4 || !validQuestionAnswer(question) || !Number.isFinite(question.points) || question.points <= 0))
    || migrated.batches.some(batch => !batch?.id || !batch.name || !Array.isArray(batch.learnerIds))
    || migrated.attempts.some(attempt => !attempt?.batchId || !attempt.userId || !Number.isFinite(attempt.score))
    || migrated.warnings.some(warning => !warning?.id || !warning.courseId || !warning.lessonId || !['未处理', '已忽略', '已确认'].includes(warning.status))) {
    throw new Error('本地考核或告警数据格式异常，请检查浏览器存储后重试');
  }
  return addTrainingExamDemo(migrated);
}
export function saveTraining(userId: string, state: TrainingState) {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export function updateLearning(state: TrainingState, courseId: string, lessonId: string, status: LearningStatus): TrainingState {
  const course = state.courses.find(item => item.id === courseId && item.published);
  if (!course || !learningLessons(course).some(lesson => lesson.id === lessonId)) throw new Error('课程已停用或内容不存在');
  const stage = trainingStages(course).find(item => stageLessons(course, item).some(lesson => lesson.id === lessonId));
  if (stage?.sequential) {
    const lessons = stageLessons(course, stage).filter(lesson => lesson.enabled !== false);
    const previous = lessons.slice(0, lessons.findIndex(lesson => lesson.id === lessonId));
    if (previous.some(lesson => !state.records.some(record => record.courseId === courseId && record.lessonId === lesson.id && record.status === '已完成'))) throw new Error('请先完成本阶段前面的课程');
  }
  const existing = state.records.find(record => record.courseId === courseId && record.lessonId === lessonId);
  if (existing?.status === '已完成' && status === '学习中') return state;
  const record = { ...existing, courseId, lessonId, status, updatedAt: new Date().toISOString(), ...(status === '需重学' ? { watchedSeconds: 0 } : {}) };
  return { ...state, records: [...state.records.filter(item => item.courseId !== courseId || item.lessonId !== lessonId), record] };
}

export function recordTrainingWatch(state: TrainingState, courseId: string, lessonId: string, videoId: string, seconds: number): TrainingState {
  const next = updateLearning(state, courseId, lessonId, '学习中');
  const video = state.courses.find(course => course.id === courseId)?.lessons.find(lesson => lesson.id === lessonId)?.videos?.find(item => item.active && item.id === videoId);
  if (!video || !Number.isFinite(seconds) || seconds < 0) throw new Error('视频版本或学习时长无效');
  return { ...next, records: next.records.map(record => {
    if (record.courseId !== courseId || record.lessonId !== lessonId) return record;
    const watchedSeconds = Math.min(video.duration, Math.max(record.videoId === videoId ? record.watchedSeconds ?? 0 : 0, seconds));
    return { ...record, videoId, watchedSeconds, status: watchedSeconds >= video.duration && video.duration > 0 ? '已完成' : '学习中', updatedAt: new Date().toISOString() };
  }) };
}

export function trainingSummary(state: TrainingState) {
  const courses = state.courses.filter(course => course.published).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map(course => ({ ...course, lessons: learningLessons(course) }));
  const records = courses.flatMap(course => course.lessons.map(lesson => ({
    course, lesson, record: state.records.find(item => item.courseId === course.id && item.lessonId === lesson.id)
  })));
  const counts = { '未开始': 0, '学习中': 0, '已完成': 0, '需重学': 0 };
  records.forEach(item => counts[item.record?.status || '未开始']++);
  return { courses, records, counts, total: records.length, rate: records.length ? Math.round(counts['已完成'] / records.length * 1000) / 10 : 0 };
}

export function batchWindow(batch: TrainingBatch, now = Date.now()) {
  if (!batch.enabled) return '已停用';
  if (batch.start && now < new Date(batch.start).getTime()) return '未开始';
  if (batch.end && now > new Date(batch.end).getTime()) return '已结束';
  return '进行中';
}

export function submitTrainingExam(state: TrainingState, batchId: string, userId: string, answers: Record<string, number | number[] | string>): TrainingState {
  const batch = state.batches.find(item => item.id === batchId);
  const paper = state.papers.find(item => item.id === batch?.paperId);
  if (!batch || !batch.learnerIds.includes(userId) || batchWindow(batch) !== '进行中' || !paper?.enabled || !paper.questions.length) throw new Error('当前考核不可提交');
  if (state.attempts.some(item => item.batchId === batchId && item.userId === userId)) throw new Error('本批次已交卷');
  if (paper.questions.some(question => { const answer = answers[question.id]; return question.type === 'multiple' ? !Array.isArray(answer) || !answer.length || new Set(answer).size !== answer.length || answer.some(value => !Number.isInteger(value) || value < 0 || value >= question.options.length) : question.type === 'short' ? typeof answer !== 'string' || !answer.trim() : !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= question.options.length; })) throw new Error('请完成所有题目后交卷');
  const score = paper.questions.reduce((total, question) => total + (sameTrainingAnswer(answers[question.id], question.answer) ? question.points : 0), 0);
  return { ...state, attempts: [...state.attempts, { batchId, userId, answers, score, submittedAt: new Date().toISOString() }] };
}

export function resolveTrainingWarning(state: TrainingState, id: string, status: '已忽略' | '已确认'): TrainingState {
  const warning = state.warnings.find(item => item.id === id);
  if (!warning || warning.status !== '未处理') return state;
  const next = status === '已确认' ? updateLearning(state, warning.courseId, warning.lessonId, '需重学') : state;
  return { ...next, warnings: next.warnings.map(item => item.id === id ? { ...item, status } : item) };
}

export function sameTrainingAnswer(a: number | number[] | string | undefined, b: number | number[] | string) {
  if (typeof b === 'string') return typeof a === 'string' && a.trim() === b.trim();
  return Array.isArray(b) ? Array.isArray(a) && a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]) : a === b;
}
function validQuestionAnswer(question: TrainingQuestion) {
  return question.type === 'multiple' ? Array.isArray(question.answer) && question.answer.length > 0 && new Set(question.answer).size === question.answer.length && question.answer.every(value => Number.isInteger(value) && value >= 0 && value < 4) : question.type === 'short' ? typeof question.answer === 'string' : Number.isInteger(question.answer) && Number(question.answer) >= 0 && Number(question.answer) < 4;
}
