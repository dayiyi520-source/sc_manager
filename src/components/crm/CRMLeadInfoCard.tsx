import React from 'react';
import { Lead } from '../../types';
import { StatusTag } from '../common/UIComponents';
import { CRMDetailInfoCard, CRMDetailField } from './CRMDetailInfoCard';

export const getLeadDetailFields = (lead: Lead): CRMDetailField[] => [
  { label: '学校名称', value: lead.customerName },
  { label: '联系人', value: `${lead.schoolContact} (${lead.contactPhone || '未填写'})` },
  { label: '负责人', value: lead.ownerName },
  { label: '所属部门', value: lead.department },
  { label: '意向产品', value: lead.products.join('、') || '待补充' },
  { label: '线索来源', value: lead.source }
];

export const CRMLeadInfoCard: React.FC<{ lead: Lead }> = ({ lead }) => (
  <section className="space-y-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4">
    <div className="flex items-start justify-between border-b border-[var(--border-main)] pb-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{lead.name}</h2>
      <StatusTag status={lead.status} />
    </div>
    <CRMDetailInfoCard fields={getLeadDetailFields(lead)} className="bg-transparent p-0" />
  </section>
);
