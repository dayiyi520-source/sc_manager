import type { RequirementTask, RequirementWorkOrderCandidate } from '../types';

export function collaborationCandidatesFor(
  candidates: RequirementWorkOrderCandidate[],
  requirements: RequirementTask[],
  source?: RequirementTask
): RequirementWorkOrderCandidate[] {
  const sourceCandidate: RequirementWorkOrderCandidate[] = source ? [{
    id: source.id,
    type: 'requirement',
    typeLabel: '协同事项',
    title: source.title,
    ownerName: source.ownerName,
    creatorName: source.creatorName,
    expectedCompleteDate: source.expectedCompleteDate,
    productLineName: source.productLineName,
    status: source.status,
    sourceType: 'WORK_ORDER',
    category: 'assistance'
  }] : [];
  return [...sourceCandidate, ...candidates]
    .filter((item) => item.sourceType === 'WORK_ORDER' || requirements.some((task) => task.id === item.id && item.type === 'requirement' && Boolean(task.workOrderType)))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .map((item) => ({ ...item, sourceType: 'WORK_ORDER', category: 'assistance' }));
}
