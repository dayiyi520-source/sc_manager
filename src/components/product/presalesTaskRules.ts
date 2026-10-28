export const PRESALES_TASK_TYPES = ['标前工作', '招投标工作', '标后工作', '售前宣发', '其他'] as const;

export type PresalesTaskType = (typeof PRESALES_TASK_TYPES)[number];
export type PresalesSource = { id: string; name: string };

export function readPresalesTaskFields(value: unknown): Record<string, unknown> {
  try {
    const fields = typeof value === 'string' ? JSON.parse(value) : value;
    return fields && typeof fields === 'object' && !Array.isArray(fields) ? fields as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function inferLegacyPresalesType(fields: Record<string, unknown>): PresalesTaskType | '' {
  if (PRESALES_TASK_TYPES.includes(fields.presalesType as PresalesTaskType)) return fields.presalesType as PresalesTaskType;
  return '';
}

export function presalesCustomerRequired(type: string): boolean {
  return type === '标前工作' || type === '招投标工作';
}

export function validatePresalesAssociations(type: string, sourceId: string, customerId = ''): string | undefined {
  if (type === '标前工作' && !sourceId) return '请选择关联商机';
  if (type === '招投标工作' && !sourceId) return '请选择关联招投标';
  if (!PRESALES_TASK_TYPES.includes(type as PresalesTaskType)) return '请选择售前任务类型';
  if (presalesCustomerRequired(type) && !customerId) return '请选择关联客户';
  return undefined;
}

export function presalesSpecialFields(type: string, source?: PresalesSource) {
  return {
    presalesType: type,
    ...(source && type === '招投标工作' ? { biddingId: source.id, biddingName: source.name } : {}),
    ...(source && type !== '招投标工作' ? { opportunityId: source.id, opportunityName: source.name } : {}),
  };
}
