import { MOCK_REQUIREMENT_TASKS, MOCK_USERS } from './mockSnapshot';
import type { RequirementTask } from '../types';

export const BUSINESS_TASK_SEED_VERSION = '2026-10-12-v1';
const admin = MOCK_USERS.find(user => user.role === 'admin') || MOCK_USERS[0];
const colleagues = MOCK_USERS.filter(user => user.id !== admin?.id);
const collaboration = MOCK_REQUIREMENT_TASKS.find(task => task.workOrderType);
const relatedTask = MOCK_REQUIREMENT_TASKS.find(task => !task.workOrderType);

type Sample = {
  title: string; description: string; sourceName: string; projectName: string; customerName: string;
  stage?: string; bidding?: boolean; status: string; priority: string; hours: number;
};
const presalesSamples: Sample[] = [
  { title: '智慧校园二期建设方案梳理', description: '梳理院校业务场景、现有系统与建设范围，形成售前方案初稿。', sourceName: '智慧校园二期建设商机', projectName: '智慧校园二期', customerName: '云州大学', status: '待处理', priority: '高', hours: 8 },
  { title: '教学质量评估平台产品演示', description: '准备教学质量评估演示环境和讲解脚本，确认客户关注指标。', sourceName: '教学质量评估平台采购商机', projectName: '教学质量评估平台', customerName: '江南职业学院', status: '处理中', priority: '中', hours: 6 },
  { title: '数据治理项目投标技术响应', description: '核对招标技术条款，整理逐项响应及证明材料。', sourceName: '数据治理平台公开招标', projectName: '校级数据治理平台', customerName: '海川大学', bidding: true, status: '待验收', priority: '紧急', hours: 12 },
  { title: '统一身份认证需求调研', description: '调研统一身份认证系统的接入范围、组织目录与账号同步要求。', sourceName: '统一身份认证建设商机', projectName: '统一身份认证升级', customerName: '新港理工学院', status: '已完成', priority: '中', hours: 8 },
  { title: '实训管理系统招标方案评审', description: '评审实训管理系统建设方案与交付范围，输出评审结论。', sourceName: '实训管理系统邀请招标', projectName: '实训教学管理系统', customerName: '青禾职业学院', bidding: true, status: '已退回', priority: '高', hours: 10 },
  { title: '科研管理平台报价范围核对', description: '核对科研管理模块、实施服务和报价口径，整理差异说明。', sourceName: '科研管理平台升级商机', projectName: '科研管理平台升级', customerName: '星河师范大学', status: '待处理', priority: '低', hours: 4 },
  { title: '校园门户采购技术澄清', description: '汇总门户采购技术问题，与客户确认边界并整理澄清答复。', sourceName: '校园门户建设公开招标', projectName: '校园门户整合', customerName: '北辰学院', bidding: true, status: '处理中', priority: '高', hours: 6 },
  { title: '学生服务平台演示问题复核', description: '复核演示中提出的问题，完善功能说明及可行性结论。', sourceName: '学生一站式服务平台商机', projectName: '一站式学生服务平台', customerName: '临江大学', status: '已关闭', priority: '中', hours: 5 }
];
const deliverySamples: Sample[] = [
  { title: '智慧校园项目启动资料准备', description: '整理启动会议资料、交付计划与双方责任分工。', sourceName: '', projectName: '智慧校园二期', customerName: '云州大学', stage: '项目立项', status: '待处理', priority: '高', hours: 8 },
  { title: '教学质量平台业务需求确认', description: '与院校业务部门核对指标体系、数据来源和需求确认结果。', sourceName: '', projectName: '教学质量评估平台', customerName: '江南职业学院', stage: '需求调研', status: '处理中', priority: '中', hours: 12 },
  { title: '数据治理平台试运行验收', description: '按验收清单核对数据质量和平台功能，收集试运行结论。', sourceName: '', projectName: '校级数据治理平台', customerName: '海川大学', stage: 'UAT验收', status: '待验收', priority: '紧急', hours: 16 },
  { title: '统一身份认证上线切换', description: '完成上线切换、接入应用验证及异常回退方案核对。', sourceName: '', projectName: '统一身份认证升级', customerName: '新港理工学院', stage: '割接上线', status: '已完成', priority: '高', hours: 10 },
  { title: '实训管理系统培训材料补充', description: '补充教师操作手册和培训案例，复核前次培训反馈。', sourceName: '', projectName: '实训教学管理系统', customerName: '青禾职业学院', stage: '系统开发', status: '已退回', priority: '中', hours: 6 },
  { title: '科研平台实施配置复核', description: '核对实施配置、审批流程与角色授权，整理配置交付清单。', sourceName: '', projectName: '科研管理平台升级', customerName: '星河师范大学', stage: '系统设计', status: '待处理', priority: '低', hours: 8 },
  { title: '校园门户上线回访', description: '回访上线运行情况，记录用户反馈并安排维保跟进。', sourceName: '', projectName: '校园门户整合', customerName: '北辰学院', stage: '终验维保', status: '处理中', priority: '中', hours: 4 },
  { title: '学生服务平台历史任务收尾', description: '核对阶段交付物与关闭原因，保留项目交付记录。', sourceName: '', projectName: '一站式学生服务平台', customerName: '临江大学', stage: 'UAT验收', status: '已关闭', priority: '高', hours: 6 }
];
function buildTasks(kind: 'presales' | 'delivery', samples: Sample[]): RequirementTask[] {
  return samples.map((sample, index) => {
    const owner = index < 6 ? admin : colleagues[index % Math.max(colleagues.length, 1)] || admin;
    const creator = index % 2 === 0 ? admin : colleagues[index % Math.max(colleagues.length, 1)] || admin;
    return {
      id: 'demo-' + kind + '-' + (index + 1), code: (kind === 'presales' ? 'PS' : 'DL') + '-DEMO-00' + (index + 1),
      title: sample.title, description: sample.description, expectedGoal: '完成任务检查并形成可追踪的确认记录。',
      status: sample.status, priority: sample.priority, ownerName: owner?.name || '', assigneeId: owner?.id,
      creatorName: creator?.name || '', creatorId: creator?.id, department: owner?.department,
      productLineName: '', versionName: '', projectName: sample.projectName, customerName: sample.customerName,
      specialFields: kind === 'delivery' ? { projectStage: sample.stage || '' } : sample.bidding ? { biddingName: sample.sourceName } : { opportunityName: sample.sourceName },
      estimatedHours: sample.hours, actualHours: sample.status === '已完成' ? sample.hours : sample.status === '处理中' ? 2 : 0,
      createdAt: '2026-10-' + String(5 + index).padStart(2, '0') + 'T09:00:00+08:00', dueDate: '2026-10-' + String(14 + index).padStart(2, '0'),
      sourceWorkOrderIds: index === 0 && collaboration ? [collaboration.id] : [],
      sourceWorkOrderTitles: index === 0 && collaboration ? [collaboration.title] : [],
      relatedTaskIds: index === 0 && relatedTask ? [relatedTask.id] : []
    };
  });
}
export const MOCK_PRESALES_TASKS = buildTasks('presales', presalesSamples);
export const MOCK_DELIVERY_TASKS = buildTasks('delivery', deliverySamples);
