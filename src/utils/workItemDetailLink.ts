const TASK_PAGES: Record<string, string> = {
  requirement: 'prod_req_tasks', design: 'prod_design_tasks', dev: 'prod_rd_tasks',
  test: 'prod_test_tasks', bug: 'prod_bugs', presales: 'crm_presales_tasks',
  delivery: 'proj_delivery_tasks', ops: 'proj_ops_tasks',
};

export function workItemDetailLink(id: string, category: string, productLineId?: string, base = window.location.href): string {
  const url = new URL(base);
  const prefix = url.pathname.split('/app/')[0];
  url.pathname = `${prefix}/app/${category === 'WORK_ORDER' ? 'wb_work_order' : TASK_PAGES[category] || category}`;
  url.search = '';
  url.hash = '';
  url.searchParams.set('detailId', id);
  if (productLineId && category !== 'WORK_ORDER') url.searchParams.set('productLineId', productLineId);
  return url.toString();
}

export function openWorkItemDetailLink(id: string, category: string, productLineId?: string): void {
  // 保留 opener 以沿用当前标签页的 sessionStorage 登录会话，不复制或写入凭据。
  window.open(workItemDetailLink(id, category, productLineId), '_blank');
}
