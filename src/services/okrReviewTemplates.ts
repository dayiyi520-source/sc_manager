import type { OkrPerson } from './okrRepository';

export type ReviewTemplate = 'employee' | 'supervisor' | 'boss';

export function reviewTemplateFor(person: OkrPerson | undefined, people: OkrPerson[]): ReviewTemplate | undefined {
  if (!person) return undefined;
  if (person.rootFlag === 1) return 'boss';
  if (people.some(member => member.supervisorId === person.id && member.id !== person.id) || person.jobTitle?.includes('主管')) return 'supervisor';
  return 'employee';
}

export function reviewEditorState(status?: string) {
  switch (status) {
    case 'draft': return { label: '草稿', color: 'warning', editable: true };
    case 'returned': return { label: '已退回', color: 'error', editable: true };
    case 'submitted': return { label: '已提交', color: 'processing', editable: false };
    case 'active':
    case 'reviewed': return { label: '已评价', color: 'success', editable: false };
    default: return { label: '待填写', color: 'default', editable: status === undefined };
  }
}
