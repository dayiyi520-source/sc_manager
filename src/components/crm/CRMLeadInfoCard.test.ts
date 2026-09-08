import { describe, expect, it } from 'vitest';
import { getLeadDetailFields } from './CRMLeadInfoCard';

describe('getLeadDetailFields', () => {
  it('maps lead details into the shared detail card contract', () => {
    const fields = getLeadDetailFields({
      id: 'lead-1', name: '线索', customerId: 'c-1', customerName: '客户', schoolContact: '联系人', contactPhone: '',
      department: '市场运营部', ownerName: '负责人', source: '市场活动', products: [], status: '待确认', createdAt: '2026-09-04'
    });
    expect(fields.map((field) => field.label)).toEqual(['学校名称', '联系人', '负责人', '所属部门', '意向产品', '线索来源']);
    expect(fields[4].value).toBe('待补充');
  });
});
