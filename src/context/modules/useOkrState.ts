import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workbenchGoalTargets } from '../../services/workbenchGoalTargets';
import { okrRepository } from '../../services/okrRepository';
import type { CurrentUser, OKRItem, PerformanceReview } from '../../types';

export function useOkrState(currentUser: CurrentUser, enabled: boolean) {
  const [okrs, setOkrs] = useState<OKRItem[]>([]);
  const [performances, setPerformances] = useState<PerformanceReview[]>([]);
  const okrQuery = useQuery({ queryKey: ['okr', currentUser.id, 'records'], queryFn: () => okrRepository.records(currentUser.id), enabled });

  useEffect(() => {
    setOkrs(workbenchGoalTargets(okrQuery.data || [], currentUser));
  }, [okrQuery.data, currentUser.id, currentUser.name, currentUser.department]);

  return { okrs, setOkrs, performances, setPerformances };
}
