import { directoryProjects } from './customerDirectoryData';
import type { Contract } from '../types';

const sources = [
  {
    id: 'receivable-demo-contract-001', code: 'AR-DEMO-CT-001',
    name: '智慧校园平台建设演示合同', projectName: '智慧校园一体化平台建设项目',
    amount: 3200000, signDate: '2026-10-15',
    stages: [
      { phase: '第一期（合同生效款）', percentage: 30, amount: 960000, triggerCondition: '合同签订生效后 7 个工作日内', dueDate: '2026-10-26' },
      { phase: '第二期（项目初验款）', percentage: 40, amount: 1280000, triggerCondition: '项目部署完成并通过初验', dueDate: '2026-12-20' },
      { phase: '第三期（项目终验款）', percentage: 30, amount: 960000, triggerCondition: '项目终验通过后', dueDate: '2027-03-31' }
    ]
  },
  {
    id: 'receivable-demo-contract-002', code: 'AR-DEMO-CT-002',
    name: '在线精品课程资源库演示合同', projectName: '在线精品课程资源库建设项目',
    amount: 1800000, signDate: '2026-10-20',
    stages: [
      { phase: '第一期（启动款）', percentage: 20, amount: 360000, triggerCondition: '合同签订并启动项目', dueDate: '2026-11-05' },
      { phase: '第二期（资源交付款）', percentage: 50, amount: 900000, triggerCondition: '课程资源完成交付并确认', dueDate: '2026-12-25' },
      { phase: '第三期（验收尾款）', percentage: 30, amount: 540000, triggerCondition: '项目验收通过后', dueDate: '2027-02-28' }
    ]
  },
  {
    id: 'receivable-demo-contract-003', code: 'AR-DEMO-CT-003',
    name: '智慧实训基地升级演示合同', projectName: '智慧实训基地升级项目',
    amount: 960000, signDate: '2026-11-01',
    stages: [
      { phase: '第一期（项目启动款）', percentage: 40, amount: 384000, triggerCondition: '合同签订生效后', dueDate: '2026-11-15' },
      { phase: '第二期（平台交付款）', percentage: 40, amount: 384000, triggerCondition: '实训平台部署并完成交付', dueDate: '2027-01-15' },
      { phase: '第三期（验收款）', percentage: 20, amount: 192000, triggerCondition: '项目最终验收通过', dueDate: '2027-03-15' }
    ]
  }
];

export const RECEIVABLE_DEMO_CONTRACTS: Contract[] = sources.flatMap((source) => {
  const project = directoryProjects().find((item) => item.name === source.projectName);
  if (!project?.customerId) return [];
  return [{
    id: source.id,
    code: source.code,
    name: source.name,
    customerId: project.customerId,
    customerName: project.customerName,
    relatedProduct: project.name,
    type: '主合同',
    amount: source.amount,
    signDate: source.signDate,
    status: '履行中',
    paymentStages: source.stages.map((stage) => ({ ...stage, status: '待付款' })),
    isDemo: true
  }];
});
