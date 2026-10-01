import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import { requirementRepository } from '../../services/requirementRepository';

export function useProductQueries(sessionToken: string, enabled: boolean) {
  return {
    requirementQuery: useQuery({ queryKey: ['requirements', sessionToken], queryFn: () => requirementRepository.list({ page: 1, pageSize: 100 }), enabled }),
    designQuery: useQuery({ queryKey: ['design-tasks', sessionToken], queryFn: () => productRepository.designTasks({ page: 1, pageSize: 100 }), enabled }),
    productLineQuery: useQuery({ queryKey: ['product-lines', sessionToken], queryFn: () => productRepository.productLines(), enabled }),
    bugQuery: useQuery({ queryKey: ['product-bugs', sessionToken], queryFn: () => productRepository.tasks('bug', { page: 1, pageSize: 100 }), enabled }),
    devTaskQuery: useQuery({ queryKey: ['product-dev-tasks', sessionToken], queryFn: () => productRepository.tasks('dev', { page: 1, pageSize: 100 }), enabled }),
  };
}
