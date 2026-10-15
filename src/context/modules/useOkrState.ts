import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workbenchGoalTargets } from '../../services/workbenchGoalTargets';
import { okrRepository } from '../../services/okrRepository';
import type { CurrentUser, OKRItem, PerformanceReview } from '../../types';

export function useOkrState(currentUser: CurrentUser, enabled: boolean) {
  const [okrs, setOkrs] = useState<OKRItem[]>([]);
  const [performances, setPerformances] = useState<PerformanceReview[]>([]);
  const okrQuery = useQuery({ queryKey: ['okr', currentUser.id, 'records'], queryFn: () => okrRepository.records(currentUser.id), enabled });

  const peopleQuery = useQuery({ queryKey: ['okr', currentUser.id, 'people'], queryFn: okrRepository.people, enabled });

  useEffect(() => {
    setOkrs(workbenchGoalTargets(okrQuery.data || [], currentUser, peopleQuery.data?.find(person => person.id === currentUser.id)));
  }, [okrQuery.data, peopleQuery.data, currentUser.id, currentUser.name, currentUser.department, currentUser.role, currentUser.roleTitle]);

  return { okrs, setOkrs, performances, setPerformances };
}
