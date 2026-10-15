import React from 'react';
import { MemberSelectionModal } from '../common/MemberSelectionModal';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { teamRepository } from '../../services/teamRepository';
import { productRepository } from '../../services/productRepository';
import type { ProductLine, ProductLineMember } from '../../types';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine: ProductLine;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ isOpen, onClose, productLine }) => {
  const { addProductLineMembers, addToast } = useApp();
  const employeesQuery = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: isOpen, retry: false });
  const rolesQuery = useQuery({ queryKey: ['product-role-templates'], queryFn: productRepository.productRoleTemplates, enabled: isOpen, retry: false });
  const existingUserIds = (productLine.members || []).filter((member): member is ProductLineMember => typeof member !== 'string').map(member => member.userId);
  return <MemberSelectionModal isOpen={isOpen} onClose={onClose} subtitle={productLine.name} subtitleSuffix={`(${productLine.code})`}
    employees={employeesQuery.data || []} roles={Array.from(new Set((rolesQuery.data || []).map(item => item.name.trim()).filter(Boolean))).map(name => ({ label: name, value: name }))}
    existingUserIds={existingUserIds} employeesLoading={employeesQuery.isLoading} rolesLoading={rolesQuery.isLoading} employeesError={employeesQuery.isError} rolesError={rolesQuery.isError}
    onRetryEmployees={() => void employeesQuery.refetch()} onRetryRoles={() => void rolesQuery.refetch()}
    onSave={async (role, ids) => {
      const employeeById = new Map((employeesQuery.data || []).map(employee => [employee.id, employee]));
      await addProductLineMembers(productLine.id, ids.map((userId, index) => ({ id: `pending-${Date.now()}-${index}`, userId, name: employeeById.get(userId)?.name || '', role })));
      addToast('success', '成员添加成功');
    }}/>;
};
