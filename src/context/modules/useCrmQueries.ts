import { useQuery } from '@tanstack/react-query';
import { customerDirectoryRepository } from '../../services/customerDirectoryRepository';

export function useCrmQueries(sessionToken: string, enabled: boolean) {
  return {
    leadQuery: useQuery({ queryKey: ['crm', 'leads', sessionToken], queryFn: () => customerDirectoryRepository.leads({ page: 1, pageSize: 100 }), enabled }),
    customerQuery: useQuery({ queryKey: ['crm', 'customers', sessionToken], queryFn: () => customerDirectoryRepository.customers({ page: 1, pageSize: 100 }), enabled }),
    opportunityQuery: useQuery({ queryKey: ['crm', 'opportunities', sessionToken], queryFn: () => customerDirectoryRepository.opportunities({ page: 1, pageSize: 100 }), enabled }),
    biddingQuery: useQuery({ queryKey: ['crm', 'biddings', sessionToken], queryFn: () => customerDirectoryRepository.biddings(), enabled }),
    engagementQuery: useQuery({ queryKey: ['crm', 'winning-engagements', sessionToken], queryFn: () => customerDirectoryRepository.engagements(), enabled }),
    followUpQuery: useQuery({ queryKey: ['crm', 'follow-ups', sessionToken], queryFn: () => customerDirectoryRepository.followUps(), enabled }),
    contractQuery: useQuery({ queryKey: ['crm', 'contracts', sessionToken], queryFn: () => customerDirectoryRepository.contracts(), enabled }),
  };
}
