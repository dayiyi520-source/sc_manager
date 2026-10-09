export const workOrderDisplayName = (value?: string | null) => {
  if (value === '客户诉求') return '产品需求';
  if (value === '其他问题') return '其他协同';
  return value || '';
};
