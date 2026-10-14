// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiRequest } from './mockApi';
import { directoryCustomers, directoryLeads, directoryOpportunities, directoryProjects } from './customerDirectoryData';
import { projectDeliveryMap } from './projectDeliveryMap';
import { MOCK_CUSTOMERS, MOCK_LEADS, MOCK_OPPORTUNITIES, MOCK_TEAM_MEMBERS } from '../data/mockSnapshot';

describe('客户与商机统一数据源', () => {
  beforeEach(() => localStorage.clear());
  it('menus and snapshot consumers read the same committed records', async () => {
    for (const [kind, rows] of [['customers', MOCK_CUSTOMERS], ['leads', MOCK_LEADS], ['opportunities', MOCK_OPPORTUNITIES]] as const) {
      const page = await mockApiRequest(`/api/customer-directory/${kind}`);
      expect(page.items.map((row: { id: string }) => row.id)).toEqual(rows.map(row => row.id));
      expect(page.total).toBeGreaterThan(0);
    }
    expect(directoryProjects().map(row => row.id)).toEqual(projectDeliveryMap().map(row => row.id));
    expect(directoryProjects().every(row => row.customerId && directoryCustomers().some(customer => customer.id === row.customerId && customer.name === row.customerName))).toBe(true);
    expect(directoryCustomers()).toEqual(MOCK_CUSTOMERS);
  });
  it('searches only names and paginates filtered results', async () => {
    const target = directoryCustomers()[0];
    const page = await mockApiRequest(`/api/customer-directory/customers?keyword=${encodeURIComponent(target.name)}&pageSize=1`);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe(target.id);
    expect((await mockApiRequest('/api/customer-directory/leads?keyword=不存在的线索')).total).toBe(0);
  });
  it('resolves all four staff columns by member ID and follows member renames', async () => {
    const lead = directoryLeads()[0];
    for (const id of [...directoryLeads().flatMap(row => [row.ownerId, row.registrarId]), ...directoryOpportunities().flatMap(row => [row.ownerId, row.presalesOwnerId])]) expect(MOCK_TEAM_MEMBERS.some(member => member.id === id)).toBe(true);
    localStorage.setItem('shichuang.frontend.mock.teamMembers', JSON.stringify(MOCK_TEAM_MEMBERS.map(member => member.id === lead.ownerId ? { ...member, name: '成员新名称' } : member)));
    expect(directoryLeads()[0].ownerName).toBe('成员新名称');
    vi.resetModules();
    const reloaded = await import('./customerDirectoryData');
    expect(reloaded.directoryLeads()[0].ownerName).toBe('成员新名称');
    expect(reloaded.directoryCustomers()).toEqual(directoryCustomers());
  });
  it('rejects write and detail requests instead of returning fake successes', async () => {
    await expect(mockApiRequest('/api/customer-directory/leads', { method: 'POST', body: '{}' })).rejects.toThrow('仅支持查看');
    await expect(mockApiRequest('/api/customer-directory/customers/anything')).rejects.toThrow('入口不存在');
  });
});
