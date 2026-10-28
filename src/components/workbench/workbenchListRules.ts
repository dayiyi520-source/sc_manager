import type { ApprovalFlow } from '../../types';

export const pendingFor = (flow: ApprovalFlow, name: string) => flow.status === '待审批' && flow.nodes.some(node => node.approver === name && node.status === 'current');
export const reviewedBy = (flow: ApprovalFlow, name: string) => flow.nodes.some(node => node.approver === name && (node.status === 'passed' || node.status === 'rejected'));

export function latestItems<T>(items: T[], dateOf: (item: T) => string | undefined, limit: number): T[] {
  return items.map((item, index) => ({ item, index, timestamp: Date.parse(dateOf(item) || '') }))
    .sort((a, b) => (Number.isFinite(b.timestamp) ? b.timestamp : -Infinity) - (Number.isFinite(a.timestamp) ? a.timestamp : -Infinity) || a.index - b.index)
    .slice(0, limit).map(({ item }) => item);
}
