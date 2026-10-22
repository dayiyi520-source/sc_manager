import type { CurrentUser, EmployeeOption } from '../types';

export const WORKBENCH_ORGANIZATIONS = [
  { id: 'shichuang', name: '师创组织' },
  { id: 'agency', name: '代理商组织' },
] as const;
export type AudienceScope = [string] | [string, string];
export function validAudienceShape(scopes: unknown): scopes is AudienceScope[] {
  return Array.isArray(scopes) && scopes.length > 0 && scopes.every(path => Array.isArray(path) && (path.length === 1 || path.length === 2) && WORKBENCH_ORGANIZATIONS.some(org => org.id === path[0]) && (path.length === 1 || typeof path[1] === 'string' && Boolean(path[1].trim())));
}
export const organizationOf = (person: { organizationId?: string }) => person.organizationId || 'shichuang';
export function organizationOptions(people: EmployeeOption[]) {
  return WORKBENCH_ORGANIZATIONS.map(org => ({ value: org.id, label: org.name,
    children: [...new Set(people.filter(person => organizationOf(person) === org.id).map(person => person.department?.trim()).filter((value): value is string => Boolean(value)))].sort().map(department => ({ value: department, label: department })),
  }));
}
export function validateAudience(scopes: AudienceScope[] | undefined, people: EmployeeOption[]) {
  if (!Array.isArray(scopes) || !scopes.length) throw new Error('请选择可见范围');
  const options = organizationOptions(people);
  if (scopes.some(path => !Array.isArray(path) || path.length < 1 || path.length > 2 || !options.some(org => org.value === path[0] && (path.length === 1 || org.children.some(department => department.value === path[1]))))) throw new Error('请选择有效的组织或部门');
  const unique = [...new Map(scopes.map(path => [JSON.stringify(path), path])).values()];
  return unique.filter(path => path.length === 1 || !unique.some(other => other.length === 1 && other[0] === path[0]));
}
export function audienceIncludes(scopes: AudienceScope[], viewer: Pick<CurrentUser, 'department' | 'organizationId'>) {
  return scopes.some(path => path[0] === organizationOf(viewer) && (path.length === 1 || path[1] === viewer.department?.trim()));
}
export function audienceLabel(scopes?: AudienceScope[]) {
  if (!scopes?.length) return '原指定范围';
  return scopes.map(path => [WORKBENCH_ORGANIZATIONS.find(org => org.id === path[0])?.name || '组织已失效', ...path.slice(1)].join(' / ')).join('、');
}
