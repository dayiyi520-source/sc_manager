import { apiRequest } from './apiClient';
import type { EmployeeOption, TeamMember } from '../types';

export type TeamMemberInput = Pick<TeamMember, 'name' | 'department' | 'jobTitle' | 'phone' | 'email'>;

const queryString = (values: Record<string, string>) => {
  const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value)).toString();
  return query ? `?${query}` : '';
};

export const teamRepository = {
  list: (filters: { keyword?: string; department?: string; status?: string } = {}) => apiRequest<TeamMember[]>(`/api/team-members${queryString({ keyword: filters.keyword || '', department: filters.department || '', status: filters.status || '' })}`),
  departments: () => apiRequest<string[]>('/api/team-members/departments'),
  options: () => apiRequest<EmployeeOption[]>('/api/team-members/options'),
  create: (body: TeamMemberInput) => apiRequest<TeamMember>('/api/team-members', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: TeamMemberInput & { version: number }) => apiRequest<TeamMember>(`/api/team-members/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateStatus: (id: string, status: TeamMember['status'], version: number) => apiRequest<TeamMember>(`/api/team-members/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, version }) }),
};
