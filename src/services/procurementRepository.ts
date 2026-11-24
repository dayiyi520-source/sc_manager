import type { ProcurementItem, ProjectItem } from '../types';

const STORAGE_KEY = 'shichuang.frontend.mock.procurementItems';

const createDemoProcurementItems = (projects: ProjectItem[]): ProcurementItem[] => {
  const fixtures = [
    { projectName: '在线精品课程资源库建设项目', code: 'PO-DEMO-2026-013', supplier: '演示供应商·华东设备服务', description: '课程资源建设设备采购', amount: 86400, status: '待审批' },
    { projectName: '智慧实训基地升级项目', code: 'PO-DEMO-2026-021', supplier: '演示供应商·云安软件服务', description: '实训平台软件服务采购', amount: 53000, status: '已完成' }
  ];
  const matched = fixtures.flatMap((fixture) => {
    const project = projects.find((item) => item.name === fixture.projectName);
    if (!project) return [];
    return [{
      id: 'demo-purchase-' + fixture.code,
      code: fixture.code,
      type: '项目采购',
      supplier: fixture.supplier,
      description: fixture.description,
      amount: fixture.amount,
      status: fixture.status,
      isDemo: true,
      projectId: project.id,
      projectName: project.name,
      customerId: project.customerId,
      customerName: project.customerName,
      relatedCustomer: project.customerName,
      relatedProject: project.name,
      orderTime: '2026-11-04'
    }];
  });
  if (matched.length || !projects.length) return matched;
  return projects.slice(0, 2).map((project, index) => ({
    id: 'demo-purchase-fallback-' + project.id,
    code: 'PO-DEMO-INIT-' + String(index + 1).padStart(3, '0'),
    type: '项目采购',
    supplier: '演示供应商',
    description: index === 0 ? '项目设备采购演示记录' : '项目服务采购演示记录',
    amount: index === 0 ? 12000 : 18500,
    status: index === 0 ? '待审批' : '已完成',
    isDemo: true,
    projectId: project.id,
    projectName: project.name,
    customerId: project.customerId,
    customerName: project.customerName,
    relatedCustomer: project.customerName,
    relatedProject: project.name,
    orderTime: '2026-11-04'
  }));
};

export function loadProcurementItems(projects: ProjectItem[] = []): ProcurementItem[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    const initial = createDemoProcurementItems(projects);
    if (!projects.length) return initial;
    try { saveProcurementItems(initial); } catch { /* Keep the demo available for this session. */ }
    return initial;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProcurementItems(items: ProcurementItem[]): void {
  if (typeof localStorage === 'undefined') throw new Error('当前环境不支持保存项目采购');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
