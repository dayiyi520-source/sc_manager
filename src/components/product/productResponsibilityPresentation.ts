import type { ProductLine } from '../../types';

export type ResponsibilityValue = string | string[] | undefined | null;

export const normalizeResponsibilityNames = (value: ResponsibilityValue): string[] => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .flatMap((item) => String(item).split(/[,，、]/))
    .map((item) => item.trim())
    .filter(Boolean);
};

export const responsibilityNames = (productLine: ProductLine, role: 'requirement' | 'tech' | 'test') => {
  const secondary = role === 'requirement'
    ? productLine.requirementOwnerSecondary
    : role === 'tech' ? productLine.techOwnerSecondary : productLine.testOwnerSecondary;
  return normalizeResponsibilityNames(secondary);
};

export const responsibilitySummary = (value: ResponsibilityValue) => {
  const names = normalizeResponsibilityNames(value);
  if (!names.length) return { label: '', title: '' };
  return { label: `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}`, title: names.join('、') };
};
