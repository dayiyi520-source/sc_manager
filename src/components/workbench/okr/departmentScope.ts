import type { OkrPerson } from '../../../services/okrRepository';
export const departmentName = (value?: string) => (value || '').trim();
export function otherDepartmentPeople(people: OkrPerson[], currentUserId: string, currentDepartment?: string): OkrPerson[] {
  const own = departmentName(people.find(person => person.id === currentUserId)?.department || currentDepartment);
  if (!own) return [];
  return people.filter(person => person.id !== currentUserId && departmentName(person.department) !== own);
}
