import type { TrainingState, TrainingPaper, TrainingQuestion, TrainingLearner } from './trainingRepository';

export function createTrainingExamDemo() {
  const learners: TrainingLearner[] = ['熊婧', '苏敏逸', '曹玥', '周忱', '吴清', '王美珍', '胡飞', '刘老师', '牧佳', '郭老师', '陆老师', '魏翔', '康雪'].map((name, index) => ({ id: `training-demo-learner-${index + 1}`, name, account: `demo${String(index + 1).padStart(3, '0')}`, department: index < 5 ? '组织 / 售前方案部' : index < 7 ? '组织 / 代理商' : '组织 / 临时人员', phone: '' }));
  const names = ['产教融合与校企合作平台', '重大项目管理与绩效评价平台', '校园大脑服务平台'];
  const prompts = [
    ['在产教融合业务痛点中，“信息孤岛突出”带来的直接业务影响是（）', ['企业经营风险无法识别', '多部门数据分散，重复录入，数据难以共享利用', '协议到期无法提醒', '考核指标无法自定义配置']],
    ['平台企业入库备案的核心业务流程是（）', ['企业注册→线上缴费', '准入申请→资质审核', '协议签订→成果上报', '考核评价→企业退出']],
    ['业务系统上线前应优先完成哪些准备？', ['明确业务目标', '核对基础数据', '跳过权限检查', '直接删除历史数据']],
    ['跨部门协作需要哪些基础能力？', ['统一数据口径', '明确责任分工', '共享账号密码', '忽略审批记录']],
    ['培训学习资料应如何管理？', ['随意覆盖已发布资料', '按业务场景和版本整理', '清空学习记录', '不区分资料版本']]
  ];
  const papers: TrainingPaper[] = names.map((name, index) => ({ id: `training-demo-paper-${index + 1}`, name, passScore: index === 0 ? 75 : 80, enabled: true, questions: Array.from({ length: index === 2 ? 20 : 35 }, (_, q): TrainingQuestion => {
    const multiple = index < 2 && q >= 15;
    const prompt = prompts[q % prompts.length];
    return { id: `demo-question-${index}-${q}`, title: q < 2 && index === 0 ? prompt[0] as string : `${name} · 演示题 ${q + 1}：${multiple ? '规范业务协作应包括哪些做法？' : '下列哪项符合规范的业务流程？'}`, type: multiple ? 'multiple' : 'single', options: multiple ? ['统一业务口径', '保留操作记录', '共用管理员密码', '跳过审核流程'] : prompt[1] as string[], answer: multiple ? [0, 1] : 1, points: index === 2 ? 5 : multiple ? 2 : 4 };
  }) }));
  const batches = papers.map((paper, index) => ({ id: `training-demo-batch-${index + 1}`, name: ['2026_产教融合专项考核', '2026_重大项目管理专项考核', '2026_校园大脑专项考核'][index], paperId: paper.id, start: '', end: '', enabled: true, learnerIds: learners.slice(0, 5 + index).map(learner => learner.id) }));
  const attempts = batches.flatMap((batch, index) => batch.learnerIds.map((userId, learnerIndex) => {
    const paper = papers[index]; const target = [50, 60, 40, 60, 40, 65, 75][learnerIndex]; let score = 0;
    const answers: Record<string, number | number[] | string> = {};
    paper.questions.forEach(question => { const correct = score + question.points <= target; answers[question.id] = correct ? question.answer : question.type === 'multiple' ? [2] : 0; if (correct) score += question.points; });
    return { batchId: batch.id, userId, score, submittedAt: `2026-09-10T00:${String(20 + learnerIndex).padStart(2, '0')}:00+08:00`, answers };
  }));
  return { papers, batches, attempts, learners };
}

export function addTrainingExamDemo(state: TrainingState): TrainingState {
  if (state.examDemoVersion === 1) return state;
  const demo = createTrainingExamDemo();
  return { ...state, papers: [...state.papers, ...demo.papers.filter(item => !state.papers.some(existing => existing.id === item.id))], batches: [...state.batches, ...demo.batches.filter(item => !state.batches.some(existing => existing.id === item.id))], attempts: [...state.attempts, ...demo.attempts.filter(item => !state.attempts.some(existing => existing.batchId === item.batchId && existing.userId === item.userId))], learners: [...(state.learners || []), ...demo.learners.filter(item => !state.learners?.some(existing => existing.id === item.id))], examDemoVersion: 1 };
}
