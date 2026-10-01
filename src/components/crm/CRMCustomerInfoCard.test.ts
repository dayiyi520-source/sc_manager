import { describe, expect, it } from 'vitest';
import { getCustomerDetailFields } from './CRMCustomerInfoCard';

describe('getCustomerDetailFields', () => {
  it('maps customer profile data to the shared detail card', () => {
    const fields = getCustomerDetailFields({
      id: 'c-1', name: '客户', code: 'C-1', type: '高校', level: 'A级-重点', contactName: '张三', contactPhone: '138', contactTitle: '主任',
      source: '主动开发', lastFollowUp: '', tags: [], address: '上海', industry: '教育', scale: '大型', activeProjectsCount: 0, potentialOppsCount: 0, createdAt: '2026-09-04'
    });
    expect(fields).toHaveLength(10);
    expect(fields[0].value).toBe('高校');
    expect(fields[9].value).toBe('暂无');
  });
});
