/** Idempotent migration of product template copies and historical task bindings. */
const categoryCode = (category: string) => ({ 产品: 'requirement', 需求: 'requirement', 设计: 'design', 研发: 'dev', 测试: 'test', 缺陷: 'bug' } as Record<string, string>)[category] || category;
export function syncProductTemplates(products: any[], templates: any[]) {
  const available = templates.filter(type => type.workflow?.definition?.states?.some((state: any) => state.enabled !== false));
  const signature = JSON.stringify(available);
  return products.map(product => {
    if (product.workItemTemplateSignature === signature) return product;
    const previous = product.workItemTypes || [];
    const inherited = available.map(template => {
      const existing = previous.find((type: any) => type.sourceTemplateId === template.id || type.id === template.id || (type.name === template.name && categoryCode(type.category) === categoryCode(template.category)));
      const typeId = existing?.id || `template-${product.id}-${template.id}`;
      const workflowId = existing?.workflows?.find((flow: any) => flow.status === 'PUBLISHED')?.id || existing?.workflow?.id || `workflow-${typeId}`;
      return { ...template, id: typeId, sourceTemplateId: template.id, workflow: undefined, revision: Number(existing?.revision || 0) + 1,
        workflows: [{ ...template.workflow, id: workflowId, taskTypeId: typeId, category: categoryCode(template.category), status: 'PUBLISHED' }] };
    });
    const categories = new Set(available.map(type => categoryCode(type.category)));
    const custom = previous.filter((type: any) => !type.sourceTemplateId && (!type.name || !categories.has(categoryCode(type.category))));
    return { ...product, workItemTypes: [...inherited, ...custom], workItemTemplateSignature: signature };
  });
}
export function migrateWorkItems(tasks: any[], products: any[], members: any[], templates: any[] = []) {
  const enabledMembers = members.filter(member => member.status === 'enabled');
  return tasks.map(task => {
    let next = task;
    if (task.category === 'requirement' && task.workOrderType) return task;
    const product = products.find(product => product.id === task.productLineId);
    const boundWorkflow = [...(product?.workItemTypes || []), ...templates]
      .flatMap((type: any) => [type.workflow, ...(type.workflows || [])])
      .find((flow: any) => flow?.id === task.workflowId);
    const hasValidBinding = Boolean(task.statusKey && boundWorkflow?.definition?.states?.some((state: any) => state.key === task.statusKey));
    const seed = [...String(task.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const types = product?.workItemTypes || [];
    const candidates = types.filter((type: any) => type.enabled !== false && (categoryCode(type.category) === task.category || (!type.category && type.id === (task.taskTypeId || task.workItemTypeId))));
    const type = candidates.find((type: any) => type.id === (task.taskTypeId || task.workItemTypeId)) || candidates.find((type: any) => type.name === (task.type || task.requirementType || task.taskType)) || candidates.find((type: any) => type.isDefault) || candidates[0];
    const workflow = type?.sourceTemplateId ? type.workflows?.find((flow: any) => flow.status === 'PUBLISHED') : undefined;
    const states = workflow?.definition?.states?.filter((state: any) => state.enabled !== false) || [];
    if (states.length && !hasValidBinding) {
      const statusName = typeof task.status === 'string' ? task.status : task.status?.name;
      const state = states.find((state: any) => state.name === statusName) || states.find((state: any) => state.key === task.statusKey) || states[seed % states.length];
      if (task.taskTypeId !== type.id || task.workItemTypeId !== type.id || task.workflowId !== workflow.id || task.statusKey !== state.key || statusName !== state.name) {
        next = { ...next, taskTypeId: type.id, workItemTypeId: type.id, workflowId: workflow.id, statusKey: state.key, status: state.name, revision: Number(task.revision || 0) + 1 };
      }
    }
    if (task.category === 'bug' && enabledMembers.length) {
      const testers = enabledMembers.filter(member => /测试|质量/.test(member.jobTitle || ''));
      const pool = testers.length ? testers : enabledMembers;
      const verifier = enabledMembers.find(member => task.verifierId ? member.id === task.verifierId : member.name === task.verifierName) || pool[seed % pool.length];
      if (task.verifierId !== verifier.id || task.verifierName !== verifier.name) next = { ...next, verifierId: verifier.id, verifierName: verifier.name };
    }
    return next;
  });
}
export function isPendingVerification(task: { verifierId?: string; verifierName?: string; status: string }, user: { id: string; name: string }) {
  return (task.verifierId ? task.verifierId === user.id : task.verifierName?.trim() === user.name.trim()) && ['已修复', '待验证', '待验收', '待确认', '验证中'].includes(task.status);
}
