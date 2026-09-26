import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { okrRepository } from '../../services/okrRepository';
import type { CurrentUser, OKRItem, PerformanceReview } from '../../types';

export function useOkrState(currentUser: CurrentUser, enabled: boolean) {
  const [okrs, setOkrs] = useState<OKRItem[]>([]);
  const [performances, setPerformances] = useState<PerformanceReview[]>([]);
  const okrQuery = useQuery({ queryKey: ['okr', currentUser.id, 'records'], queryFn: () => okrRepository.records(currentUser.id), enabled });

  useEffect(() => {
    setOkrs((okrQuery.data || []).filter((record) => record.kind === 'objective' && record.ownerId === currentUser.id).map((record) => ({
      id: record.id,
      cycle: record.periodKey,
      ownerId: record.ownerId,
      ownerName: currentUser.name,
      department: currentUser.department,
      category: 'my',
      objective: record.payload.title,
      weight: 100,
      progress: record.payload.progress || 0,
      deadline: record.periodKey,
      parentObjectiveId: record.payload.parentObjectiveId,
      parentKeyResultId: record.payload.parentKeyResultId,
      keyResults: (record.payload.keyResults || []).map((keyResult) => ({ id: keyResult.id, content: keyResult.title, weight: keyResult.weight, progress: keyResult.progress, deadline: record.periodKey })),
    })));
  }, [okrQuery.data, currentUser.id, currentUser.name, currentUser.department]);

  return { okrs, setOkrs, performances, setPerformances };
}
