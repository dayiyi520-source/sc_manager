import { useQuery } from '@tanstack/react-query';
import { crmRepository } from '../../services/crmRepository';

export function useCrmQueries(sessionToken: string, enabled: boolean) {
  return {
    leadQuery: useQuery({ queryKey: ['crm', 'leads', sessionToken], queryFn: () => crmRepository.leads({ page: 1, pageSize: 100 }), enabled }),
    customerQuery: useQuery({ queryKey: ['crm', 'customers', sessionToken], queryFn: () => crmRepository.customers({ page: 1, pageSize: 100 }), enabled }),
    opportunityQuery: useQuery({ queryKey: ['crm', 'opportunities', sessionToken], queryFn: () => crmRepository.opportunities({ page: 1, pageSize: 100 }), enabled }),
    biddingQuery: useQuery({ queryKey: ['crm', 'biddings', sessionToken], queryFn: () => crmRepository.biddings({ page: 1, pageSize: 100 }), enabled }),
    engagementQuery: useQuery({ queryKey: ['crm', 'winning-engagements', sessionToken], queryFn: () => crmRepository.engagements({ page: 1, pageSize: 100 }), enabled }),
    followUpQuery: useQuery({ queryKey: ['crm', 'follow-ups', sessionToken], queryFn: () => crmRepository.followUps({ page: 1, pageSize: 100 }), enabled }),
    contractQuery: useQuery({ queryKey: ['crm', 'contracts', sessionToken], queryFn: () => crmRepository.contracts({ page: 1, pageSize: 100 }), enabled }),
  };
}
