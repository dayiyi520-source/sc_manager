import React from 'react';
import { Customer } from '../../types';
import { StatusTag } from '../common/UIComponents';
import { CRMDetailInfoCard, CRMDetailField } from './CRMDetailInfoCard';

export const getCustomerDetailFields = (customer: Customer): CRMDetailField[] => [
  { label: '客户主体类型', value: normalizeCustomerType(customer.type) },
  { label: '客户等级', value: <StatusTag status={customer.level} /> },
  { label: '主联系人及职务', value: `${customer.contactName} (${customer.contactTitle})` },
  { label: '联系电话 / 邮箱', value: `${customer.contactPhone}${customer.contactEmail ? ` · ${customer.contactEmail}` : ''}` },
  { label: '所属行业', value: customer.industry },
  { label: '预估年度 IT 预算', value: `¥${((customer.annualBudget || 0) / 10000).toFixed(0)} 万元/年` },
  { label: '客户来源渠道', value: customer.source || '主动开发' },
  { label: '最近跟进时间', value: customer.lastFollowUp || '未记录' },
  { label: '注册及办公地址', value: customer.address, wide: true },
  { label: '业务画像标签', value: customer.tags?.join('、') || '暂无', wide: true }
];

const normalizeCustomerType = (value?: string) => value === '高校' || value === '教育主管单位' || value === '其他' ? value : '其他';

export const CRMCustomerInfoCard: React.FC<{ customer: Customer }> = ({ customer }) => (
  <CRMDetailInfoCard fields={getCustomerDetailFields(customer)} />
);
